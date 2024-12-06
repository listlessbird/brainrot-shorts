"use server";

import { getCurrentSession } from "@/lib/auth";
import { YoutubeService } from "@/lib/yt/yt.service";
import { redirect } from "next/navigation";

export async function startYoutubeFlow() {
  const { user } = await getCurrentSession();

  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const ytService = new YoutubeService();

  redirect(ytService.getAuthUrl());
}
