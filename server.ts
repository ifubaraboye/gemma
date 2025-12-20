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
      // 1. Destructure 'webSearchEnabled' from request
      const { model, models, messages, isAgentMode, webSearchEnabled } = await req.json();
      
      const targetModels = isAgentMode && models && models.length > 0 ? models : [model];

      if (!targetModels || !messages) {
        return Response.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const sendSSE = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

          const processModel = async (modelId: string) => {
            try {
              let history = [...messages];

              // 2. Only signal searching & add plugin IF enabled
              if (webSearchEnabled) {
                sendSSE({ modelId, status: "searching" });
              }

              const commonBody = {
                // Conditionally add plugins
                plugins: webSearchEnabled ? [{ id: "web", max_results: 5 }] : undefined,
              };

              const completionReq = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": SITE_URL,
                  "X-Title": SITE_NAME,
                },
                body: JSON.stringify({
                  model: modelId,
                  messages: history,
                  tools: TOOLS,
                  tool_choice: "auto",
                  stream: false,
                  ...commonBody, // Spread plugins (or undefined)
                }),
              });

              const initialRes = await completionReq.json();
              if (initialRes.error) throw new Error(initialRes.error.message);

              const choice = initialRes.choices?.[0];
              const message = choice?.message;
              const toolCalls = message?.tool_calls;

              if (toolCalls && toolCalls.length > 0) {
                history.push(message);
                for (const tool of toolCalls) {
                  const args = JSON.parse(tool.function.arguments);
                  const result = await executeTool(tool.function.name, args);
                  history.push({
                    role: "tool",
                    tool_call_id: tool.id,
                    name: tool.function.name,
                    content: result,
                  });
                }
              } else if (message?.content) {
                sendSSE({ modelId, content: message.content });
                sendSSE({ modelId, content: "", done: true });
                return;
              }

              const finalStreamReq = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": SITE_URL,
                  "X-Title": SITE_NAME,
                },
                body: JSON.stringify({
                  model: modelId,
                  messages: history,
                  stream: true,
                  ...commonBody,
                }),
              });

              if (!finalStreamReq.body) throw new Error("No body");

              const reader = finalStreamReq.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

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
                      const delta = json.choices?.[0]?.delta?.content || "";
                      if (delta) sendSSE({ modelId, content: delta });
                    } catch (e) { /* ignore */ }
                  }
                }
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

console.log("✅ Server (Conditional Web Search) running on :3001");