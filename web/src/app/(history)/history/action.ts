"use server";

import { getAllGenerations } from "@/db/db-fns";
import { validateRequest } from "@/lib/auth";
import { makeSignedUrl, r2 } from "@/lib/r2";
import { HistoryQueryData } from "@/types";

export async function getAllGenerationsAction(): Promise<HistoryQueryData[]> {
  const { user } = await validateRequest();

  if (!user) {
    return [];
  }

  const generations = await getAllGenerations(user.googleId);

  const generationsWithSignedUrls = await Promise.all(
    generations.map(async (generation) => {
      const imageCount = generation.images?.length || 0;
      let signedImageUrl: string | null = null;

      if (imageCount > 0) {
        const randomIndex = Math.floor(Math.random() * imageCount);
        const imageName = generation.images[randomIndex].split("/").pop();

        if (imageName) {
          const key = `${generation.configId}/images/${imageName}`;
          signedImageUrl = await makeSignedUrl(r2, key);
        }
      }

      return {
        id: generation.id,
        images: signedImageUrl || [],
        configId: generation.configId,
        topic: generation.topic!,
        duration: generation.duration!,
        status: generation.status,
      } satisfies HistoryQueryData;
    })
  );

  return generationsWithSignedUrls;
}
