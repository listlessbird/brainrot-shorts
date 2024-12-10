"use server";

import { getUploadedVideosFromDb } from "@/db/yt-fns";
import { getCurrentSession } from "@/lib/auth";
import { YoutubeService } from "@/lib/yt/yt.service";

export async function uploadToYTAction({
  videoUrl,
  onProgress,
  title,
  description,
  generationId,
}: {
  videoUrl: string;
  title: string;
  description: string;
  onProgress?: (progress: number) => void;
  generationId: string;
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
      generationId,
    });

    return result;
  } catch (error) {
    console.error("Error uploading to YouTube:", error);
    throw new Error("Failed to upload video to YouTube");
  }
}

export async function getUploaded(configId: string) {
  const { user } = await getCurrentSession();

  if (!user?.googleId) {
    throw new Error("Unauthorized");
  }

  const uploaded = await getUploadedVideosFromDb(configId);
  return uploaded;
}
