"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setWaiting(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, newMessage] }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";

    if (reader) {
      setWaiting(false);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

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
    setWaiting(false);
  };

  const markdownComponents: Components = {
    code(props) {
      const { children, className } = props;
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <SyntaxHighlighter
          PreTag="div"
          language={match[1]}
          style={oneDark as any}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-[#2a2a28] px-1.5 py-0.5 rounded text-sm text-orange-300">
          {children}
        </code>
      );
    },
    p: ({ children }) => <p className="mb-3 leading-7">{children}</p>,
    ul: ({ children }) => <ul className="list-disc ml-6 mb-3 space-y-1 text-white">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal ml-6 mb-3 space-y-1 text-white">{children}</ol>,
    li: ({ children }) => <li className="leading-7">{children}</li>,
    h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-4 text-white">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-4 text-white">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-3 text-white">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-500 pl-4 italic my-3 text-gray-300">
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    hr: () => <hr className="border-gray-600 my-4" />,
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border border-gray-600">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-[#2a2a28]">{children}</thead>,
    th: ({ children }) => <th className="border border-gray-600 px-4 py-2 text-left">{children}</th>,
    td: ({ children }) => <td className="border border-gray-600 px-4 py-2">{children}</td>,
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a18] text-white">
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-4xl mx-auto px-8 py-12 space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-lg px-6 py-3 max-w-4xl ${m.role === "user" ? "bg-[#252724]" : ""}`}>
                {m.role === "user" ? (
                  <p className="text-white whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="prose prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {waiting && (
            <div className="flex justify-start">
              <div className="px-6 py-3 max-w-4xl">
                <div className="flex space-x-1">
                  <span className="w-4 h-4 bg-white rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

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
              className="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-[#1a1a18] hover:bg-[#1d1d1c] text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}