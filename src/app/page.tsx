"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, newMessage] }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse JSON lines streaming format
        chunk.split("\n").forEach((line) => {
          if (!line.startsWith("data:")) return;
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantMessage += delta;
            }
          } catch (err) {
            console.error("Failed to parse chunk:", err);
          }
        });

        // Update last assistant message in real-time
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: assistantMessage }];
          } else {
            return [...prev, { id: Date.now().toString(), role: "assistant", content: assistantMessage }];
          }
        });
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a18] text-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-4xl mx-auto px-8 py-12 space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-lg px-6 py-3 max-w-4xl ${m.role === "user" ? "bg-[#252724]" : ""}`}>
                <p className="text-white whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 w-[calc(100%-10px)] bg-[#1a1a18]/95 backdrop-blur-md z-50">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 rounded-lg bg-[#252724] text-white placeholder-white focus:outline-none focus:ring-1 focus:ring-white"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-[#1a1a18] hover:bg-[#1d1d1c] text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
