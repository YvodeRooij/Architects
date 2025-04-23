import { NextRequest } from "next/server";
import { streamArchitectureAssistant } from "@/app/langgraph/graph";

export async function POST(req: NextRequest) {
  const { userInput } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamArchitectureAssistant(userInput)) {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
