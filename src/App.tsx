"use client";

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Send, 
  Copy, 
  Sparkles, 
  ChevronUp, 
  Cpu,
  Check,
  AlertCircle
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SidebarTrigger } from "@/components/ui/sidebar";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useOutletContext } from "react-router-dom";

const AVAILABLE_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "allenai/olmo-3.1-32b-think:free", name:"Olmo 3.1B Thinking"},
  { id: "mistralai/devstral-2512:free", name:"Mistral: Devstral"},
  { id: "openai/gpt-oss-120b:free", name:"GPT-OSS 120B"},
  { id: "moonshotai/kimi-k2:free", name:"Kimi K2"},
  { id: "qwen/qwen3-4b:free", name:"Qwen 3 4B"}
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

type LayoutContext = {
  activeChatId: Id<"chat"> | null;
  setActiveChatId: (id: Id<"chat">) => void;
};

export default function ChatPage() {
  const navigate = useNavigate();
  
  // 1. FIX: Initialize from localStorage to prevent reset on reload/navigation
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedModel");
      if (saved) return JSON.parse(saved);
    }
    return [AVAILABLE_MODELS[0].id];
  });

  // 2. FIX: Save to localStorage whenever selection changes
  useEffect(() => {
    localStorage.setItem("selectedModel", JSON.stringify(selectedModels));
  }, [selectedModels]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createChat = useMutation(api.chat.createChat);
  const addMessage = useMutation(api.chat.addMessage);
  const { activeChatId: chatId, setActiveChatId } =
    useOutletContext<LayoutContext>();

  const chat = useQuery(
    api.chat.getChat,
    chatId ? { chatId } : "skip"
  );

  useEffect(() => {
    // Only update messages from DB if we aren't currently loading/streaming 
    // to prevent the DB state from overwriting optimistic UI updates
    if (chat?.messages && !loading) {
      setMessages(chat.messages);
    }
  }, [chat, loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== id);
      }
      return [...prev, id];
    });
  };

  const getModelLabel = () => {
    if (selectedModels.length === 1) {
      return AVAILABLE_MODELS.find(
        (m) => m.id === selectedModels[0]
      )?.name;
    }
    return `${selectedModels.length} models`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    setError(null);
    let activeChatId = chatId;

    // Create new chat if none exists
    if (!activeChatId) {
      activeChatId = await createChat({ title: input.slice(0, 50) });
      setActiveChatId(activeChatId);
      
      // 3. FIX: Use history.pushState instead of navigate()
      // navigate() forces a Router re-check which can unmount the component, killing the stream.
      // pushState updates the URL silently so the user sees the new ID, but the component stays alive.
      window.history.pushState({}, "", `/chat/${activeChatId}`);
    }

    const userInput = input.trim();
    setInput("");
    setLoading(true);

    const assistantIndex = messages.length + 1;

    // Optimistic UI update
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userInput, timestamp: Date.now() },
      { role: "assistant", content: "", timestamp: Date.now() }
    ]);

    // Save user message to DB
    await addMessage({
      chatId: activeChatId,
      role: "user",
      content: userInput,
    });

    try {
      const res = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModels[0],
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userInput }
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let finalAssistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                finalAssistantContent += delta;
                
                setMessages((prev) => {
                  const updated = [...prev];
                  // Ensure we are updating the specific assistant message we added earlier
                  if (updated[assistantIndex]) {
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      content: finalAssistantContent,
                    };
                  }
                  return updated;
                });
              }
            } catch (parseError) {
              console.error("Failed to parse SSE chunk:", parseError);
            }
          }
        }
      }

      await addMessage({
        chatId: activeChatId,
        role: "assistant",
        content: finalAssistantContent,
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
      setMessages((prev) => prev.filter((_, i) => i !== assistantIndex));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800 relative">
      
      <div className="absolute top-3 left-3 z-50">
        <SidebarTrigger className="text-zinc-500 hover:text-zinc-200 cursor-pointer hover:bg-zinc-800" />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[800px] mx-auto px-4 py-12 space-y-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center opacity-0 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800 shadow-xl">
                <Sparkles className="w-8 h-8 text-zinc-400" />
              </div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 mb-3">
                Welcome back
              </h1>
              <p className="text-zinc-500 max-w-sm">
                Select your preferred models and start a new conversation.
              </p>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative text-[15px] leading-relaxed group ${
                  m.role === "user"
                    ? "px-5 py-3.5 rounded-2xl bg-[#18181b] text-white font-medium shadow-sm max-w-[85%]" 
                    : "text-zinc-100 w-full px-0 py-2" 
                }`}
              >
                <div className="whitespace-pre-wrap font-normal">
                  <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                </div>

                {m.role === "assistant" && m.content && (
                  <button
                    onClick={() => copyToClipboard(m.content)}
                    className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-zinc-800/50 rounded-md cursor-pointer text-zinc-500 hover:text-zinc-300"
                    title="Copy response"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 h-10 px-2">
                <span className="w-4 h-4 bg-white rounded-full animate-pulse [animation-delay:-0.3s]"></span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 bg-red-950/20 border border-red-900/50 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="p-4 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent z-10">
        <div className="max-w-[800px] mx-auto">
          <div className="relative bg-[#18181b] border border-zinc-800 rounded-3xl p-3 shadow-2xl focus-within:ring-1 focus-within:ring-zinc-700 transition-all duration-300">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="w-full bg-transparent text-zinc-200 placeholder:text-zinc-500 text-sm resize-none outline-none max-h-48 min-h-[48px] px-2 py-1 custom-scrollbar"
              rows={1}
            />

            <div className="flex justify-between items-center mt-2 px-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-transparent cursor-pointer text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 data-[state=open]:bg-zinc-800 data-[state=open]:text-zinc-200 focus:outline-none"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">{getModelLabel()}</span>
                    <ChevronUp className="w-3 h-3 opacity-50 transition-transform duration-200" />
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent 
                  className="w-64 bg-[#18181b] border-zinc-800 text-zinc-300 p-1.5" 
                  side="top" 
                  align="start" 
                  sideOffset={8}
                >
                  {AVAILABLE_MODELS.map((m) => {
                    const isSelected = selectedModels.includes(m.id);
                    return (
                      <DropdownMenuItem
                        key={m.id}
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleModel(m.id);
                        }}
                        className={`flex items-center justify-between text-sm px-2 py-2.5 rounded-md cursor-pointer focus:bg-zinc-800 focus:text-zinc-100 ${isSelected ? "text-zinc-100" : "text-zinc-400"}`}
                      >
                        <span>{m.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-gray-500" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || loading}
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    !input.trim() || loading 
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" 
                      : "bg-zinc-100 hover:bg-zinc-300 text-zinc-950 cursor-pointer"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}