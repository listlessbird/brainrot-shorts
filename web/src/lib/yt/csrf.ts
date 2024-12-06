import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db/db";

const CSRF_COOKIE_NAME = "yt_oauth_state";
const STATE_TIMEOUT = 10 * 60 * 1000;

interface CSRFState {
  state: string;
  expiresAt: number;
}

export async function generateYtStateToken(): Promise<string> {
  const state = randomBytes(32).toString("hex");
  const expiresIn = new Date(Date.now() + STATE_TIMEOUT);

  (await cookies()).set(CSRF_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresIn,
    path: "/",
    sameSite: "lax",
  });

  return state;
}

export async function validateYtStateToken(
  state: string | null
): Promise<boolean> {
  if (!state) return false;

  const storedState = (await cookies()).get(CSRF_COOKIE_NAME);

  if (!storedState || storedState.value !== state) {
    return false;
  }

  (await cookies()).delete(CSRF_COOKIE_NAME);

  return true;
}
