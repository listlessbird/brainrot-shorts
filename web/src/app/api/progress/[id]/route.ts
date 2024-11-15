import { ProgressUpdate } from "@/lib/send-progress";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface ProgressMessage {
  id: string;
  message: string;
  status: "info" | "error" | "success";
  meta?: Record<string, any>;
  timestamp: number;
}

const listenerMap = new Map<string, Set<(data: string) => void>>();

const progressSchema = z.object({
  generationId: z.string(),
  message: z.string(),
  status: z.enum(["info", "error", "success"]),
  meta: z.record(z.any()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const generationId = (await params).id;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  if (!listenerMap.has(generationId)) {
    listenerMap.set(generationId, new Set());
  }

  const listeners = listenerMap.get(generationId)!;

  const listener = (data: string) => {
    writer.write(encoder.encode(`data: ${data}\n\n`));
  };

  listeners.add(listener);

  request.signal.addEventListener("abort", () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      listenerMap.delete(generationId);
    }

    writer.close();
  });

  return new NextResponse(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { generationId, message, status, meta } = progressSchema.parse(body);

    const listeners = listenerMap.get(generationId);

    if (!listeners) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    const progressMessage = {
      id: crypto.randomUUID(),
      message,
      status,
      meta,
      timestamp: Date.now(),
    } satisfies ProgressMessage;

    listeners.forEach((listener) => listener(JSON.stringify(progressMessage)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error parsing progress update:", error);
    return NextResponse.json(
      { error: "Invalid progress update" },
      { status: 400 }
    );
  }
}
