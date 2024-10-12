import type { z } from "zod";
import type { CaptionSchema } from "../schema";

export const defaultProps = {
  topic: "topic here",
  script: [
    {
      textContent: "A boy gazing at a girl",
      imagePrompt: "A boy gazing at a girl",
    },
  ],
  images: [
    "https://images.unsplash.com/photo-1678489860935-7d1b6cd6d9a4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80",
  ],
  speechUrl: "https://example.com/speech.mp3",
  captions: [
    {
      text: "a boy",
      start: 0,
      confidence: 0,
      end: 0,
      speaker: "a boy",
    },
  ],
} satisfies {
  topic: string;
  script: { textContent: string; imagePrompt: string }[];
  images: string[];
  speechUrl: string;
  captions: z.infer<typeof CaptionSchema>[];
};
