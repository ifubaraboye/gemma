import { serve } from "bun";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = "http://localhost:3000";
const SITE_NAME = "My Chat App";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_current_weather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
        },
        required: ["location"],
      },
    },
  },
];

async function executeTool(name: string, args: any) {
  if (name === "get_current_weather") {
    // Mock response for weather
    return JSON.stringify({ location: args.location, temperature: "22", condition: "Sunny" });
  }
  return JSON.stringify({ error: "Tool not found" });
}

serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST" || url.pathname !== "/chat") return new Response("Not Found", { status: 404, headers: corsHeaders });

    try {
      const { model, models, messages, isAgentMode, webSearchEnabled } = await req.json();
      
      const targetModels = isAgentMode && models && models.length > 0 ? models : [model];

      if (!targetModels || !messages) {
        return Response.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const sendSSE = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}

`));

          const processModel = async (modelId: string) => {
            try {
              let history = [...messages];

              if (webSearchEnabled) {
                sendSSE({ modelId, status: "searching" });
              }

              const commonBody = {
                plugins: webSearchEnabled ? [{ id: "web", max_results: 5 }] : undefined,
              };

              // --- Helper Function to Perform Streaming Request ---
              const performStream = async (msgs: any[], toolsEnabled: boolean = true) => {
                const req = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": SITE_URL,
                    "X-Title": SITE_NAME,
                  },
                  body: JSON.stringify({
                    model: modelId,
                    messages: msgs,
                    tools: toolsEnabled ? TOOLS : undefined,
                    tool_choice: toolsEnabled ? "auto" : undefined,
                    stream: true,
                    ...commonBody,
                  }),
                });

                if (!req.body) throw new Error("No body");
                const reader = req.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                let finalContent = "";
                let toolCallsBuffer: Record<number, any> = {};
                let finishReason = null;

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
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices?.[0]?.delta || {};
                        finishReason = json.choices?.[0]?.finish_reason || finishReason;

                        // 1. Content
                        if (delta.content) {
                          finalContent += delta.content;
                          sendSSE({ modelId, content: delta.content });
                        }

                        // 2. Tool Calls
                        if (delta.tool_calls) {
                          delta.tool_calls.forEach((tc: any) => {
                            if (!toolCallsBuffer[tc.index]) {
                              // Initialize tool call object
                              toolCallsBuffer[tc.index] = { 
                                index: tc.index,
                                id: tc.id,
                                type: tc.type,
                                function: { 
                                  name: tc.function?.name,
                                  arguments: tc.function?.arguments || ""
                                }
                              };
                            } else {
                              // Append arguments
                              if (tc.function?.arguments) {
                                toolCallsBuffer[tc.index].function.arguments += tc.function.arguments;
                              }
                            }
                          });
                        }

                      } catch (e) { /* ignore */ }
                    }
                  }
                }
                
                return { finalContent, toolCallsBuffer, finishReason };
              };

              // --- EXECUTE FIRST PASS ---
              const { finalContent, toolCallsBuffer } = await performStream(history);

              // --- CHECK FOR TOOLS ---
              const toolCalls = Object.values(toolCallsBuffer);
              if (toolCalls.length > 0) {
                 // Update history with the assistant's request
                 history.push({
                    role: "assistant",
                    content: finalContent || null, // Can be null if only tool calls
                    tool_calls: toolCalls
                 });

                 // Execute all tools
                 for (const tool of toolCalls) {
                    try {
                        const args = JSON.parse(tool.function.arguments);
                        const result = await executeTool(tool.function.name, args);
                        
                        history.push({
                          role: "tool",
                          tool_call_id: tool.id,
                          name: tool.function.name,
                          content: result,
                        });
                    } catch (parseErr) {
                        console.error("Failed to parse tool arguments", parseErr);
                    }
                 }

                 // --- EXECUTE SECOND PASS (Get final response) ---
                 await performStream(history, false); 
              }

              sendSSE({ modelId, content: "", done: true });

            } catch (err: any) {
              console.error(`Error ${modelId}:`, err);
              sendSSE({ modelId, error: err.message || "Failed", done: true });
            }
          };

          await Promise.all(targetModels.map((m: string) => processModel(m)));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Connection": "keep-alive" },
      });

    } catch (e) {
      return Response.json({ error: "Internal Error" }, { status: 500, headers: corsHeaders });
    }
  },
});

console.log("✅ Server (Stream Fix) running on :3001");
