"use server";

import { getCurrentSession } from "@/lib/auth";
import { YoutubeService } from "@/lib/yt/yt.service";

export async function uploadToYTAction({
  videoUrl,
  onProgress,
  title,
  description,
}: {
  videoUrl: string;
  title: string;
  description: string;
  onProgress?: (progress: number) => void;
}) {
  const { user } = await getCurrentSession();

  if (!user?.googleId) {
    throw new Error("Unauthorized");
  }

  const yt = new YoutubeService();

  try {
    const result = await yt.uploadVideo({
      videoUrl,
      userId: user.googleId,
      privacyStatus: "private",
      title,
      description,
    });

    return result;
  } catch (error) {
    console.error("Error uploading to YouTube:", error);
    throw new Error("Failed to upload video to YouTube");
  }
}
