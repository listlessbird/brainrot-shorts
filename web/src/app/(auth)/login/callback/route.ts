import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { type OAuth2Tokens, decodeIdToken } from "arctic";
import { google } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies().get("google_oauth_state")?.value ?? null;
  const codeVerifier = cookies().get("google_code_verifier")?.value ?? null;

  if (
    code === null ||
    state === null ||
    storedState === null ||
    codeVerifier === null
  ) {
    return new NextResponse(null, { status: 400 });
  }

  if (state !== storedState) {
    return new NextResponse(null, { status: 400 });
  }

  let tokens: OAuth2Tokens;

  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch (error) {
    console.error(error);
    return new Response(null, {
      status: 400,
    });
  }

  const claims = decodeIdToken(tokens.idToken()) as any;
  const googleUserId = claims?.sub;
  const username = claims?.name;
}
