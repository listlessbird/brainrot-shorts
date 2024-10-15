import { z } from "zod";

export const CaptionSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
  speaker: z.string().nullable(),
});

export const GeneratedAssetSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  topic: z.string(),
  duration: z.number(),
  style: z.string(),
  script: z.array(
    z.object({
      textContent: z.string(),
      imagePrompt: z.string(),
    })
  ),
  images: z.array(z.string()),
  speechUrl: z.string(),
  captionsUrl: z.string(),
  configId: z.string(),
});
