"use server";

import { getAllGenerations } from "@/db/db-fns";
import { validateRequest } from "@/lib/auth";
import { makeSignedUrl, r2 } from "@/lib/r2";

export async function getAllGenerationsAction() {
  const { user } = await validateRequest();

  if (!user) {
    return [];
  }

  const generations = await getAllGenerations(user.googleId);
  const presignImages = generations.map(async (generation) => {
    const imageCount = generation.images?.length || 0;

    if (imageCount === 0) {
      return null;
    }

    const rand = Math.floor(Math.random() * imageCount);

    const key =
      generation.configId +
      "/images/" +
      generation.images[rand].split("/").pop();
    return makeSignedUrl(r2, key);
  });

  const presignedImages = await Promise.all(presignImages);

  return generations.map((genreation, index) => {
    return { ...genreation, images: presignedImages[index] };
  });
}
