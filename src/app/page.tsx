"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
}

export default function Page() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: input,
      };
      sendMessage({ text: input });
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a18] text-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-4xl mx-auto px-8 py-12 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-2">
              {message.role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-[#252724] rounded-lg px-6 py-3 max-w-2xl">
                    {/* Render user text parts */}
                    {message.parts?.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <p
                            key={`${message.id}-${i}`}
                            className="text-md text-gray-100"
                          >
                            {part.text}
                          </p>
                        );
                      }
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className=" rounded-lg px-6 py-3 max-w-2xl">
                    {/* Render AI text parts */}
                    {message.parts?.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <p
                            key={`${message.id}-${i}`}
                            className="text-gray-300 leading-relaxed whitespace-pre-wrap"
                          >
                            {part.text}
                          </p>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 w-[calc(100%-10px)]  bg-[#1a1a18]/95 backdrop-blur-md z-50">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 rounded-lg bg-[#252724] text-white placeholder-white focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all text-md"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 top-1/2 cursor-pointer -translate-y-1/2 h-8 w-8 rounded-md bg-[#1a1a18] hover:bg-[#1d1d1c] text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
