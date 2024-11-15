"use server";

import { getAllGenerationsByConfigId } from "@/db/db-fns";
import { validateRequest } from "@/lib/auth";
import { makeSignedUrl, r2 } from "@/lib/r2";
import { notFound } from "next/navigation";

export async function getGenerationAction(generationId: string) {
  const { user } = await validateRequest();

  const generations = await getAllGenerationsByConfigId(
    generationId,
    user.googleId
  );

  if (
    !generations ||
    !generations.configId ||
    !generations.images ||
    !generations.script ||
    !generations.speechUrl
  ) {
    notFound();
  }

  const imagePresigningPromises = (generations.images || []).map(
    async (image) => {
      const keyFromImage = `${generations.configId}/images/${image
        .split("/")
        .pop()}`;
      return makeSignedUrl(r2, keyFromImage);
    }
  );

  const speechKey = generations.speechUrl
    ? `${generations.configId}/speech/${generations.speechUrl.split("/").pop()}`
    : null;

  const captionsKey = generations.captionsUrl
    ? `${generations.configId}/transcriptions/${generations.captionsUrl
        .split("/")
        .pop()}`
    : null;

  const videoKey = generations.videoUrl
    ? `${generations.configId}/video/${generations.videoUrl.split("/").pop()}`
    : null;

  const [
    presignedImages,
    presignedSpeechUrl,
    presignedCaptionsUrl,
    preSignedVideoUrl,
  ] = await Promise.all([
    Promise.all(imagePresigningPromises),
    speechKey ? makeSignedUrl(r2, speechKey) : null,
    captionsKey ? makeSignedUrl(r2, captionsKey) : null,
    videoKey ? makeSignedUrl(r2, videoKey) : null,
  ]);

  return {
    ...generations,
    images: presignedImages,
    speechUrl: presignedSpeechUrl,
    captionsUrl: presignedCaptionsUrl,
    videoUrl: preSignedVideoUrl,
  };
}
