"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Copy, 
  Bot, 
  Sparkles, 
  ChevronUp, 
  Cpu,
  Check
} from "lucide-react";

// Import Shadcn Dropdown Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem, // Switched to MenuItem for custom layout
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Configuration ---
const AVAILABLE_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "mistralai/mistral-small-3.2-24b-instruct", name: "Mistral Small 3.2" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([AVAILABLE_MODELS[0].id]);
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // --- Handlers ---
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
    if (selectedModels.length === 0) return "Select Model";
    if (selectedModels.length === 1) {
      return AVAILABLE_MODELS.find(m => m.id === selectedModels[0])?.name;
    }
    return `${selectedModels.length} models`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Response simulated from **${selectedModels.length}** models.\nSelected: ${selectedModels.join(", ")}`,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800">
      
      {/* 1. Main Chat Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
          
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
                    : "text-white min-w-[200px]"
                }`}
              >
                <div className="whitespace-pre-wrap font-normal">{m.content}</div>
                
                {m.role === "assistant" && (
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

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 2. Input Area (Floating) */}
      <div className="p-4 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent z-10">
        <div className="max-w-3xl mx-auto">
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
                        // Use onSelect + e.preventDefault() to act as a toggle without closing menu
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleModel(m.id);
                        }}
                        className={`
                          flex items-center justify-between text-sm px-2 py-2.5 rounded-md cursor-pointer
                          focus:bg-zinc-800 focus:text-zinc-100
                          ${isSelected ? "text-zinc-100 " : "text-zinc-400"}
                        `}
                      >
                        <span>{m.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-gray-600" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Send Button */}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
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