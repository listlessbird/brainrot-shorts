import { SessionValidationResult, validateSessionToken } from "@/lib/session";
import { cookies } from "next/headers";
import { cache } from "react";
import { Google } from "arctic";

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  //todo: remove all hardcoded urls and use env var
  "http://localhost:3000/login/google/callback"
);

export const getCurrentSession = cache(
  async (): Promise<SessionValidationResult> => {
    const token = cookies().get("session")?.value ?? null;

    if (token === null) {
      return { session: null, user: null };
    }

    const result = await validateSessionToken(token);
    return result;
  }
);
