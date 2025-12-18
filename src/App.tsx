"use client";

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Send, 
  Copy, 
  Sparkles, 
  ChevronUp, 
  Cpu,
  Check,
  AlertCircle,
  Bot
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  { id: "qwen/qwen3-4b:free", name:"Qwen 3 4B"},
  { id: "google/gemini-3-pro-preview", name:"Gemini 3 Pro"},
  { id: "google/gemini-3-flash-preview", name:"Gemini 3 Flash"},
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", name:"Venice: Uncensored"},
];

interface Message {
  id?: string; // Added ID for reliable tracking
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  completedModels?: string[];
}

type LayoutContext = {
  activeChatId: Id<"chat"> | null;
  setActiveChatId: (id: Id<"chat">) => void;
};

// --- Sub-Component for Model Cards ---
const MultiModelDisplay = ({ 
  content, 
  isStreaming,
  completedModels = []
}: { 
  content: string; 
  isStreaming: boolean;
  completedModels?: string[];
}) => {
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  
  let modelResponses: Record<string, string> = {};
  let isMultiModel = false;
  
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      modelResponses = parsed;
      isMultiModel = true;
    }
  } catch (e) {
    isMultiModel = false;
  }

  if (!isMultiModel) {
    return (
      <div className="whitespace-pre-wrap font-normal">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    );
  }

  const models = Object.keys(modelResponses);

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-wrap gap-2">
        {models.map((modelId) => {
          const modelName = AVAILABLE_MODELS.find(m => m.id === modelId)?.name || modelId;
          const isActive = activeModelId === modelId;
          const hasContent = modelResponses[modelId]?.length > 0;
          const isCompleted = completedModels.includes(modelId) || (!isStreaming && hasContent);

          return (
            <button
              key={modelId}
              onClick={() => setActiveModelId(isActive ? null : modelId)}
              className={`
                flex flex-col items-start p-3 rounded-md border text-left transition-all min-w-[200px] cursor-pointer
                ${isActive 
                  ? "bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500" 
                  : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
                }
              `}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-zinc-100">{modelName}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full " />}
              </div>
              
              <span className="text-[10px] font-medium mt-1">
                {isCompleted ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 animate-in fade-in duration-300">
                     Task completed
                  </span>
                ) : hasContent ? (
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Streaming...
                  </span>
                ) : (
                  <span className="text-zinc-500">Thinking...</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {activeModelId && (
        <div className="mt-4 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            <Bot className="w-3 h-3" />
            Output from {AVAILABLE_MODELS.find(m => m.id === activeModelId)?.name}
          </div>
          <div className="whitespace-pre-wrap font-normal min-h-[60px]">
             {modelResponses[activeModelId] ? (
               <Markdown remarkPlugins={[remarkGfm]}>{modelResponses[activeModelId]}</Markdown>
             ) : (
               <span className="text-zinc-600 italic">Waiting for response...</span>
             )}
          </div>
        </div>
      )}
      
      {!activeModelId && (
        <div className="text-zinc-600 text-sm italic mt-2 pl-1">
          Select a model card above to view its response.
        </div>
      )}
    </div>
  );
};

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedModel");
      if (saved) return JSON.parse(saved);
    }
    return [AVAILABLE_MODELS[0].id];
  });

  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    if (!isAgent && selectedModels.length > 1) {
      setSelectedModels([selectedModels[0]]);
    }
  }, [isAgent, selectedModels]);

  useEffect(() => {
    localStorage.setItem("selectedModel", JSON.stringify(selectedModels));
  }, [selectedModels]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- SAFETY LOCK: Prevents double prompts/fetches ---
  const processedChatId = useRef<string | null>(null);
  
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
    if (chatId === null) {
      setMessages([]);
      setInput("");
      setError(null);
      processedChatId.current = null;
    }
  }, [chatId]);

  useEffect(() => {
    if (chat?.messages) {
      if (!loading) {
        setMessages(chat.messages);
      }
      if (chat.messages.length > 0) {
        const lastAssistantMessage = [...chat.messages].reverse().find(m => m.role === "assistant");
        
        if (lastAssistantMessage) {
          try {
            const parsed = JSON.parse(lastAssistantMessage.content);
            const isAgentChat = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
            
            setIsAgent(isAgentChat);
            
            if (isAgentChat) {
              const usedModels = Object.keys(parsed);
              if (usedModels.length > 0) {
                setSelectedModels(usedModels);
              }
            }
          } catch (e) {
            setIsAgent(false);
          }
        }
      }
    }
  }, [chat, loading]);

  const isChatStarted = messages.length > 0;

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
      if (!isAgent) {
        return [id];
      }
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

  // 3. Extracted Core Streaming Logic with ID Fixes
  const processUserMessage = async (
    userContent: string, 
    currentModels: string[], 
    agentMode: boolean, 
    activeChatId: Id<"chat">,
    initialMessages: Message[] = [] 
  ) => {
    setError(null);
    setLoading(true);

    const initialContent = agentMode 
      ? JSON.stringify(currentModels.reduce((acc, modelId) => ({ ...acc, [modelId]: "" }), {}))
      : "";

    // Generate specific ID for tracking
    const assistantMsgId = Math.random().toString(36).substring(7);

    const newUserMessage: Message = { 
      role: "user", 
      content: userContent, 
      timestamp: Date.now() 
    };
    
    const newAssistantMessage: Message = { 
      id: assistantMsgId, // Track ID
      role: "assistant", 
      content: initialContent, 
      timestamp: Date.now(), 
      completedModels: [] 
    };

    setMessages((prev) => [...prev, newUserMessage, newAssistantMessage]);
    
    try {
      addMessage({
        chatId: activeChatId,
        role: "user",
        content: userContent,
      }).catch(err => console.error("Failed to save user message:", err));

      const res = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: currentModels[0], 
          models: currentModels,
          isAgentMode: agentMode,
          messages: [
            ...initialMessages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userContent }
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
      let accumulatedResponses: Record<string, string> = {};
      currentModels.forEach(m => accumulatedResponses[m] = "");
      let plainStringAccumulator = "";
      let completedModels: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const payloadStr = trimmed.slice(6);
              if (payloadStr === "[DONE]") continue;

              const payload = JSON.parse(payloadStr);

              if (payload.modelId) {
                const { modelId, content = "", done: modelDone } = payload;

                if (modelDone && !completedModels.includes(modelId)) {
                  completedModels.push(modelId);
                }

                if (content) {
                  if (agentMode) {
                    accumulatedResponses[modelId] = (accumulatedResponses[modelId] || "") + content;
                    setMessages((prev) => {
                      const updated = [...prev];
                      // Find via ID
                      const msgIndex = updated.findIndex(m => m.id === assistantMsgId);
                      if (msgIndex !== -1) {
                        updated[msgIndex] = {
                          ...updated[msgIndex],
                          content: JSON.stringify(accumulatedResponses),
                          completedModels: [...completedModels]
                        };
                      }
                      return updated;
                    });
                  } else {
                    plainStringAccumulator += content;
                    setMessages((prev) => {
                      const updated = [...prev];
                      // Find via ID
                      const msgIndex = updated.findIndex(m => m.id === assistantMsgId);
                      if (msgIndex !== -1) {
                        updated[msgIndex] = {
                          ...updated[msgIndex],
                          content: plainStringAccumulator,
                          completedModels: [...completedModels]
                        };
                      }
                      return updated;
                    });
                  }
                }

                 if (modelDone) {
                    setMessages((prev) => {
                       const updated = [...prev];
                       const msgIndex = updated.findIndex(m => m.id === assistantMsgId);
                       if (msgIndex !== -1) {
                         updated[msgIndex] = {
                           ...updated[msgIndex],
                           completedModels: [...completedModels]
                         };
                       }
                       return updated;
                     });
                 }
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
        content: agentMode ? JSON.stringify(accumulatedResponses) : plainStringAccumulator,
        completedModels: agentMode ? completedModels : undefined,
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
      // Clean up the optimistic message if failed
      setMessages((prev) => prev.filter(m => m.id !== assistantMsgId));
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Submit: Route first if New Chat
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput("");
    
    // CASE A: NEW CHAT -> Create ID, Navigate, Pass State. 
    if (!chatId) {
      setLoading(true); 
      try {
        const newChatId = await createChat({ 
          title: userInput.slice(0, 50),
          modelCount: selectedModels.length 
        });
        setActiveChatId(newChatId);
        
        navigate(`/chat/${newChatId}`, { 
          state: { 
            initialInput: userInput,
            initialModels: selectedModels,
            initialIsAgent: isAgent
          } 
        });
      } catch (err: any) {
        setError("Failed to create chat");
        setLoading(false);
      }
      return;
    }

    // CASE B: EXISTING CHAT -> Process immediately
    await processUserMessage(userInput, selectedModels, isAgent, chatId, messages);
  };

  // 5. Detect incoming state from "New Chat" redirection
  useEffect(() => {
    if (
      chatId && 
      location.state?.initialInput && 
      processedChatId.current !== chatId // Check lock
    ) {
      // Set lock
      processedChatId.current = chatId;

      const { initialInput, initialModels, initialIsAgent } = location.state;
      
      // Clear navigation state
      window.history.replaceState({}, document.title);

      if (initialModels) setSelectedModels(initialModels);
      if (initialIsAgent !== undefined) setIsAgent(initialIsAgent);

      processUserMessage(initialInput, initialModels, initialIsAgent, chatId, []);
    }
  }, [chatId, location]);

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
              className={`flex gap-4 animate-in fade-in duration-500 slide-in-from-bottom-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative text-[15px] leading-relaxed group ${
                  m.role === "user"
                    ? "px-5 py-3.5 rounded-2xl bg-[#18181b] text-white font-medium shadow-sm max-w-[85%]" 
                    : "text-zinc-100 w-full px-0 py-2" 
                }`}
              >
                 {/* --- MOVED LOADING DOTS INSIDE BUBBLE --- */}
                {m.role === "assistant" && loading && idx === messages.length - 1 && !m.content ? (
                   <div className="flex items-center gap-1.5 h-6 px-1 my-1">
                     <span className="w-4 h-4 bg-zinc-200 rounded-full animate-pulse"></span>
                   </div>
                ) : (
                  <MultiModelDisplay 
                    content={m.content} 
                    isStreaming={loading && idx === messages.length - 1}
                    completedModels={m.completedModels || []}
                  />
                )}

                {m.role === "assistant" && !m.content.startsWith("{") && m.content && (
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

          {/* --- REMOVED BOTTOM LOADING INDICATOR --- */}

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
              <div className="flex items-center gap-3">
                
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
                    className="w-64 bg-[#18181b] border-zinc-800 text-zinc-300 p-1.5 shadow-xl" 
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
                          className={`flex items-center gap-3 text-sm px-2 py-2.5 rounded-md cursor-pointer focus:bg-zinc-800 focus:text-zinc-100 ${isSelected ? "text-zinc-100" : "text-zinc-400"}`}
                        >
                          <div 
                            className={`
                              flex items-center justify-center w-4 h-4 border transition-all
                              ${isSelected 
                                ? "bg-zinc-100 border-zinc-100 text-black" 
                                : "border-zinc-600 bg-transparent hover:border-zinc-500"
                              }
                            `}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          
                          <span>{m.name}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div 
                  className={`flex items-center space-x-2 pl-2 border-l border-zinc-800 transition-opacity duration-300 ${isChatStarted ? "opacity-60" : "opacity-100"}`}
                  title={isChatStarted ? `Agent mode is ${isAgent ? 'active' : 'inactive'} and locked for this chat` : "Toggle Agent Mode"}
                >
                  <Switch 
                    id="agent-mode" 
                    checked={isAgent}
                    onCheckedChange={setIsAgent}
                    disabled={isChatStarted}
                    className="scale-75 cursor-pointer data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700 border border-zinc-600 data-[state=checked]:border-emerald-500 transition-colors disabled:cursor-not-allowed"
                  />
                  <Label 
                    htmlFor="agent-mode" 
                    className={`text-xs font-medium transition-colors ${
                      isChatStarted 
                        ? "text-zinc-500 cursor-not-allowed" 
                        : isAgent 
                          ? "text-emerald-400 cursor-pointer" 
                          : "text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    }`}
                  >
                    Agent
                  </Label>
                </div>

              </div>

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