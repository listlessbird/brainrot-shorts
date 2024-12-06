"use server";

import { db } from "@/db/db";
import { youtubeCredentialsTable } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { YoutubeService } from "@/lib/yt/yt.service";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function startYoutubeFlow() {
  const { user } = await getCurrentSession();

  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const ytService = new YoutubeService();

  const authUrl = await ytService.getAuthUrl();

  redirect(authUrl);
}

export async function disconnectYoutube() {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(youtubeCredentialsTable)
    .where(eq(youtubeCredentialsTable.userId, user.googleId));

  return { success: true };
}

export async function getYoutubeStatus() {
  const { user } = await getCurrentSession();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const credentials = await db.query.youtubeCredentialsTable.findFirst({
    where: eq(youtubeCredentialsTable.userId, user.googleId),
  });

  return { connected: Boolean(credentials) };
}
