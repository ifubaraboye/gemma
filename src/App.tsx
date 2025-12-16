"use client";

import { useState, useRef, useEffect } from "react";
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

// --- Configuration ---
const API_URL = "http://localhost:3001/chat";

const AVAILABLE_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "allenai/olmo-3.1-32b-think:free", name:"Olmo 3.1B Thinking"},
  { id: "mistralai/devstral-2512:free", name:"Mistral: Devstral"},
  { id: "openai/gpt-oss-120b:free", name:"GPT-OSS 120B"}
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([
    AVAILABLE_MODELS[0].id
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // ------------------------------
  // SUBMIT (Streaming SSE)
  // ------------------------------
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    setError(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Create placeholder for assistant message
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };
    
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModels[0],
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          
          if (!trimmed || trimmed === "data: [DONE]") continue;
          
          if (trimmed.startsWith("data: ")) {
            try {
              const jsonStr = trimmed.slice(6); // Remove "data: " prefix
              const parsed = JSON.parse(jsonStr);
              
              const delta = parsed.choices?.[0]?.delta?.content;
              
              if (delta) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, content: msg.content + delta }
                      : msg
                  )
                );
              }
            } catch (parseError) {
              console.error("Failed to parse SSE chunk:", parseError);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
      
      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
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
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800">
      
      {/* 1. Main Chat Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[800px] mx-auto px-4 py-12 space-y-8">
          
          {/* Empty State */}
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

          {/* Messages */}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-4 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`relative px-5 py-3.5 max-w-[85%] rounded-2xl text-[15px] leading-relaxed shadow-sm group ${
                  m.role === "user"
                    ? "bg-[#18181b] text-white font-medium"
                    : "text-zinc-100 min-w-[200px]"
                }`}
              >
                <div className="whitespace-pre-wrap font-normal">{m.content}</div>
                {/* {console.log(messages)} */}

                
                {m.role === "assistant" && m.content && (
                   <button 
                   onClick={() => copyToClipboard(m.content)}
                   className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-zinc-700/50 rounded-md cursor-pointer"
                   title="Copy response"
                 >
                   <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
                 </button>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
             <div className="flex gap-4">
               <div className="flex items-center gap-1.5 h-10 px-2">
                 <span className="w-4 h-4 bg-white rounded-full animate-pulse [animation-delay:-0.3s]"></span>
               </div>
             </div>
          )}

          {/* Error Message */}
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

      {/* 2. Input Area (Floating) */}
      <div className="p-4 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent z-10">
        <div className="max-w-[800px] mx-auto">
          {/* Input Container */}
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

            {/* Bottom Toolbar */}
            <div className="flex justify-between items-center mt-2 px-1">
              
              {/* SHADCN DROPDOWN MENU FOR MULTI-SELECT */}
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
                        className={`
                          flex items-center justify-between text-sm px-2 py-2.5 rounded-md cursor-pointer
                          focus:bg-zinc-800 focus:text-zinc-100
                          ${isSelected ? "text-zinc-100" : "text-zinc-400"}
                        `}
                      >
                        <span>{m.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-gray-500" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send Button */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || loading}
                  className={`
                    h-9 w-9 rounded-full flex items-center justify-center transition-all shadow-lg
                    ${!input.trim() || loading 
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" 
                      : "bg-zinc-100 hover:bg-zinc-300 text-zinc-950 cursor-pointer"}
                  `}
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