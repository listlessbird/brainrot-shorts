import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { type OAuth2Tokens, decodeIdToken } from "arctic";
import { google } from "@/lib/auth";
import { createUser, getUserFromGoogleId } from "@/db/user-fns";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from "@/lib/session";

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

  console.table(claims);
  const googleUserId = claims?.sub;
  const username = claims?.name;
  const picture = claims?.picture;
  const email = claims?.email;
  const existingUser = await getUserFromGoogleId(googleUserId);

  if (existingUser !== null) {
    const sessionToken = generateSessionToken();
    const session = await createSession(sessionToken, existingUser.id);
    setSessionTokenCookie(sessionToken, session.expiresAt);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  }

  const user = await createUser({
    email,
    googleId: googleUserId,
    username,
    picture,
  });

  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, user.id);
  setSessionTokenCookie(sessionToken, session.expiresAt);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
    },
  });
}
