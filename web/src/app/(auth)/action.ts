"use server";

import { getCurrentSession } from "@/lib/auth";
import { deleteSessionTokenCookie, invalidateSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function logOut() {
  const { session } = await getCurrentSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  await invalidateSession(session.id);
  deleteSessionTokenCookie();

  return redirect("/login");
}
