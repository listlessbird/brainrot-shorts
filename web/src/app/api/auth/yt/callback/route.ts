import { db } from "@/db/db";
import { youtubeCredentialsTable } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { YoutubeService } from "@/lib/yt/yt.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextResponse) {
  const code = req.nextUrl.searchParams.get("code");

  const { user } = await getCurrentSession();

  if (!user) {
    return new Response(null, { status: 401 });
  }

  const youtubeService = new YoutubeService();

  try {
    const tokens = await youtubeService.getTokensFromCode(code as string);

    const channelId = await youtubeService.getChannelId();

    if (!channelId) {
      return new Response("ChannelId not found", { status: 401 });
    }

    await db
      .insert(youtubeCredentialsTable)
      .values({
        userId: user.googleId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        channelId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [youtubeCredentialsTable.userId],
        set: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token!,
          updatedAt: new Date(),
        },
      });

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?yt_connected=true",
      },
    });
  } catch (error) {
    console.error("Error in /api/auth/yt/callback:", error);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?yt_connected=false",
      },
    });
  }
}
