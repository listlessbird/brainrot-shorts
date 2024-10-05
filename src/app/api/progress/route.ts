import { NextRequest, NextResponse } from "next/server";

let listeners: Set<(data: string) => void> = new Set();

export function GET(request: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const listener = (data: string) => {
    writer.write(encoder.encode(`data: ${data}\n\n`));
  };

  listeners.add(listener);

  request.signal.addEventListener("abort", () => {
    listeners.delete(listener);
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

export function POST(request: NextRequest) {
  // TODO: identify the clients
  request.json().then((body) => {
    listeners.forEach((listener) => listener(JSON.stringify(body)));
  });

  return NextResponse.json({ success: true });
}
