import { z } from "zod";

export const createVideConfigSchema = z.object({
  topic: z.string(),
  duration: z.number(),
  style: z.string(),
});

export type CreateVideoScriptConfig = z.infer<typeof createVideConfigSchema>;
