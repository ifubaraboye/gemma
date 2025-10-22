import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `${model}`,
      messages,
      stream: true, // important! enables streaming
    }),
  });

  // Return a ReadableStream directly to the frontend
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return new NextResponse(stream);
}
