// server.ts (or whatever your Bun entry file is)
import { serve } from "bun";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST" || url.pathname !== "/chat") {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    try {
      const { model, models, messages, isAgentMode } = await req.json();

      // Determine which models to query
      const targetModels = isAgentMode && models && models.length > 0 ? models : [model];

      if (!targetModels || targetModels.length === 0 || !messages) {
        return Response.json(
          { error: "Valid models and messages required" },
          { status: 400, headers: corsHeaders }
        );
      }

      // Create a unified stream
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Helper to fetch individual model stream
          const fetchModelStream = async (modelId: string) => {
            try {
              const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "http://localhost:3000",
                },
                body: JSON.stringify({
                  model: modelId,
                  messages,
                  stream: true,
                }),
              });

              if (!response.body) {
                // Send error for this specific model
                const errorPayload = JSON.stringify({
                  modelId,
                  error: "No response body",
                  done: true 
                });
                controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
                return;
              }

              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              // Inside server.ts -> fetchModelStream

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

        // Only send if there's actual content
        if (delta) {
          const payload = JSON.stringify({
            modelId,
            content: delta
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }

      } catch (e) {
        // ignore parse errors
      }
    }
  }
}

              // Signal this specific model is done
              const donePayload = JSON.stringify({
                modelId,
                content: "",
                done: true
              });
              controller.enqueue(encoder.encode(`data: ${donePayload}\n\n`));

            } catch (err) {
              console.error(`Error fetching model ${modelId}:`, err);
              const errorPayload = JSON.stringify({
                modelId,
                error: err instanceof Error ? err.message : "Failed to fetch",
                done: true
              });
              controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
            }
          };

          // Run all fetches in parallel
          await Promise.all(targetModels.map((m: string) => fetchModelStream(m)));
          
          // Send final DONE signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });

    } catch (error) {
      console.error(error);
      return Response.json({ error: "Server Error" }, { status: 500, headers: corsHeaders });
    }
  },
});

console.log("✅ Bun API running on http://localhost:3001");