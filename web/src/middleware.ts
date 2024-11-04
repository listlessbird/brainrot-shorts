import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Special handling for SSE requests
  if (request.url.includes("/api/progress")) {
    if (request.method === "GET") {
      const response = NextResponse.next();
      response.headers.set("Content-Type", "text/event-stream");
      response.headers.set("Cache-Control", "no-cache");
      response.headers.set("Connection", "keep-alive");
      response.headers.set(
        "Access-Control-Allow-Origin",
        request.headers.get("origin") || "*"
      );
      response.headers.set("Access-Control-Allow-Credentials", "true");
      return response;
    }

    if (request.method === "POST") {
      const response = NextResponse.next();
      return response;
    }
  }

  if (request.method === "GET") {
    const response = NextResponse.next();
    const token = request.cookies.get("session")?.value ?? null;

    if (token !== null) {
      response.cookies.set("session", token, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  }

  const originHeader = request.headers.get("Origin");

  const hostHeader = request.headers.get("x-forwarded-host");

  console.log({ originHeader, hostHeader });

  if (originHeader === null || hostHeader === null) {
    return new NextResponse(null, {
      status: 403,
    });
  }

  let origin: URL;

  try {
    origin = new URL(originHeader);
  } catch (e) {
    return new NextResponse(null, { status: 403 });
  }

  if (origin.host !== hostHeader) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
