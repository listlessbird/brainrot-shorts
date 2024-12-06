import { db } from "@/db/db";
import { youtubeCredentialsTable } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { validateYtStateToken } from "@/lib/yt/csrf";
import { encrypt } from "@/lib/yt/encrypt";
import { YoutubeService } from "@/lib/yt/yt.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextResponse) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const { user } = await getCurrentSession();

  if (!user) {
    return new Response(null, { status: 401 });
  }

  const isValidState = await validateYtStateToken(state);

  if (!isValidState) {
    console.error("Invalid state");
    return new Response(null, { status: 403 });
  }

  const youtubeService = new YoutubeService();

  try {
    const tokens = await youtubeService.getTokensFromCode(code as string);

    const channelId = await youtubeService.getChannelId();

    if (!channelId) {
      return new Response("ChannelId not found", { status: 401 });
    }
    const encryptedAccessToken = await encrypt(tokens.access_token!);
    const encryptedRefreshToken = await encrypt(tokens.refresh_token!);
    await db
      .insert(youtubeCredentialsTable)
      .values({
        userId: user.googleId,
        encryptedAccessToken,
        encryptedRefreshToken,
        channelId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [youtubeCredentialsTable.userId],
        set: {
          encryptedAccessToken,
          encryptedRefreshToken,
          updatedAt: new Date(),
        },
      });

    const redirectUrl = new URL("/settings/", req.url);
    redirectUrl.searchParams.set("yt_connected", "true");

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in /api/auth/yt/callback:", error);

    const redirectUrl = new URL("/settings/", req.url);
    redirectUrl.searchParams.set("yt_connected", "false");

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }
}
