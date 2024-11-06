// import { t } from "tod";
import { t } from "elysia";
export const CaptionSchema = t.Object({
  text: t.String(),
  start: t.Number(),
  end: t.Number(),
  confidence: t.Number(),
  speaker: t.Optional(t.String()),
});

export const GeneratedAssetSchema = t.Object({
  id: t.String(),
  createdAt: t.String(),
  topic: t.String(),
  duration: t.Number(),
  style: t.String(),
  script: t.Array(
    t.Object({
      textContent: t.String(),
      imagePrompt: t.String(),
    })
  ),
  images: t.Array(t.String()),
  speechUrl: t.String(),
  captionsUrl: t.String(),
  configId: t.String(),
});
