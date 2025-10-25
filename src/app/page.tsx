"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy } from "lucide-react";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const models = [
    { name: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash" },
    {
      name: "Mistral Small 3.2 24B",
      value: "mistralai/mistral-small-3.2-24b-instruct",
    },
    {
      name: "Qwen3 4B Model",
      value: "qwen/qwen3-4b:free",
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    const userInput = input;
    setInput("");  
    setLoading(true);
    setWaiting(true);

    try {
      // Create a temporary chat ID for optimistic UI
      const tempChatId = `temp-${Date.now()}`;
      const chatTitle = userInput.slice(0, 80) || "New Chat";
      
      console.log("Dispatching chat-creating event", { tempChatId, chatTitle });
      
      // Dispatch custom event to show loading chat in sidebar immediately
      const creatingEvent = new CustomEvent('chat-creating', { 
        detail: { 
          id: tempChatId, 
          title: chatTitle,
          isLoading: true 
        },
        bubbles: true,
        composed: true
      });
      window.dispatchEvent(creatingEvent);
      
      // Small delay to ensure event is processed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create chat with the first user message
      const createRes = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: chatTitle,
          messages: updatedMessages,
        }),
      });

      if (!createRes.ok) {
        console.log("Chat creation failed, dispatching failure event");
        // Remove temp chat from sidebar on error
        window.dispatchEvent(new CustomEvent('chat-creation-failed', { 
          detail: { id: tempChatId },
          bubbles: true,
          composed: true
        }));
        throw new Error("Failed to create chat");
      }

      const created = await createRes.json();
      const createdChatId = created?.id;

      console.log("Chat created successfully", { tempChatId, createdChatId });

      // Update sidebar with real chat ID
      window.dispatchEvent(new CustomEvent('chat-created', { 
        detail: { 
          tempId: tempChatId, 
          realId: createdChatId,
          chat: created
        },
        bubbles: true,
        composed: true
      }));

      // Stream the AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, model }),
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
              return [
                ...prev.slice(0, -1),
                { ...last, content: assistantMessage },
              ];
            } else {
              return [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "assistant",
                  content: assistantMessage,
                },
              ];
            }
          });
        }
      }

      setLoading(false);
      setWaiting(false);

      // After streaming completes, persist the assistant reply and navigate
      if (createdChatId) {
        const finalMessages = [
          ...updatedMessages,
          {
            id: Date.now().toString(),
            role: "assistant" as const,
            content: assistantMessage,
          },
        ];
        
        await fetch(`/api/chats/${createdChatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: finalMessages,
            title: chatTitle,
          }),
        });

        // Navigate to the new chat page
        router.push(`/chat/${createdChatId}`);
      }
    } catch (error) {
      console.error("Error during chat creation:", error);
      setLoading(false);
      setWaiting(false);
    }
  };

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
  }

  const markdownComponents: Components = {
    code(props) {
      const { children, className } = props;
      const match = /language-(\w+)/.exec(className || "");
      return match ? (
        <SyntaxHighlighter
          PreTag="div"
          language={match[1]}
          style={oneDark as any}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-[#2a2a28] px-1.5 py-0.5 rounded text-sm text-orange-300">
          {children}
        </code>
      );
    },
    p: ({ children }) => <p className="mb-3 leading-7">{children}</p>,
    ul: ({ children }) => (
      <ul className="list-disc ml-6 mb-3 space-y-1 text-white">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal ml-6 mb-3 space-y-1 text-white">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-7">{children}</li>,
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mb-3 mt-4 text-white">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold mb-3 mt-4 text-white">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-bold mb-2 mt-3 text-white">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-500 pl-4 italic my-3 text-gray-300">
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-blue-400 hover:text-blue-300 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="font-bold text-white">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    hr: () => <hr className="border-gray-600 my-4" />,
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border border-gray-600">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-[#2a2a28]">{children}</thead>,
    th: ({ children }) => (
      <th className="border border-gray-600 px-4 py-2 text-left">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-600 px-4 py-2">{children}</td>
    ),
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a18] text-white">
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="max-w-4xl mx-auto px-8 py-12 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Welcome to Gemma</h1>
                <p className="text-gray-400">Start a new conversation below</p>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-6 py-3 max-w-4xl mb-4 ${
                  m.role === "user" ? "bg-[#252724]" : ""
                }`}
              >
                {m.role === "user" ? (
                  <p className="text-white whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="prose prose-invert max-w-none pb-20 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {m.content}
                    </ReactMarkdown>
                    <button onClick={() => copyToClipboard(m.content)}>
                      <Copy className="h-4 cursor-pointer hover:opacity-70" />
                    </button>
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

      <div className="sticky bottom-0 w-full">
        <div className="max-w-212 mx-auto p-3 bg-[#161616] rounded-t-3xl">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-3 px-4 py-3 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Type your message here..."
                className="flex-1 bg-transparent outline-none text-white placeholder-white text-sm resize-none max-h-48 min-h-12 font-sans"
                rows={1}
              />
            </div>

            <div className="flex justify-between items-center mt-3 px-2">
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-48 bg-transparent border-0 text-sm text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e1e] border-[#2a2a2a]">
                  {models.map((model) => (
                    <SelectItem
                      key={model.value}
                      value={model.value}
                      className="text-gray-400 hover:text-white"
                    >
                      <div className="text-white">{model.name}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || loading}
                className="h-10 w-10 rounded-full cursor-pointer bg-[#3a3a3a] hover:bg-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed text-white transition shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}