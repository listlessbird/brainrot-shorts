import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface ProgressMessage {
  id: string;
  message: string;
  status: "info" | "error" | "success";
  meta?: Record<string, any>;
  timestamp: number;
}

interface ProgressState {
  listeners: Set<(data: string) => void>;
  messages: ProgressMessage[];
}

const progressMap = new Map<string, ProgressState>();

const progressSchema = z.object({
  generationId: z.string(),
  message: z.string(),
  status: z.enum(["info", "error", "success"]),
  meta: z.record(z.any()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqParams = await params;

  const generationId = reqParams.id;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  if (!progressMap.has(generationId)) {
    progressMap.set(generationId, {
      listeners: new Set(),
      messages: [],
    });
  }

  const progressState = progressMap.get(generationId)!;

  // send existing messages to the client

  for (const message of progressState.messages) {
    writer.write(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
  }

  const listener = (data: string) => {
    writer.write(encoder.encode(`data: ${data}\n\n`));
  };

  progressState.listeners.add(listener);

  request.signal.addEventListener("abort", () => {
    progressState.listeners.delete(listener);

    if (progressState.listeners.size === 0) {
      if (progressState.listeners.size === 0) {
        progressMap.delete(generationId);
      }
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

    if (!progressMap.has(generationId)) {
      progressMap.set(generationId, {
        listeners: new Set(),
        messages: [],
      });
    }

    const progressState = progressMap.get(generationId)!;

    const msg = {
      id: crypto.randomUUID(),
      message,
      status,
      meta,
      timestamp: Date.now(),
    } satisfies ProgressMessage;

    progressState.messages.push(msg);

    progressState.listeners.forEach((listener) =>
      listener(JSON.stringify(msg))
    );

    if (status === "success" || status === "error") {
      if (progressState.listeners.size === 0) {
        progressMap.delete(generationId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error parsing progress update:", error);
    return NextResponse.json(
      { error: "Invalid progress update" },
      { status: 400 }
    );
  }
}
