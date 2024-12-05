import { getAllGenerations } from "@/db/db-fns";
import { getAllGenerationsByConfigId } from "@/db/db-fns";
import { Generation } from "@/db/schema";

export type GenerationViewType = Awaited<ReturnType<typeof getAllGenerations>>;
export type GeneratedAssetType = Awaited<
  ReturnType<typeof getAllGenerationsByConfigId>
>;

export type GenerationPreview = Pick<Generation, "configId" | "status">;

export interface GenerationState {
  id: string;
  script?: {
    scenes: Array<{ imagePrompt: string; textContent: string }>;
    scriptId: string;
  };
  speech?: {
    url: string;
    signedUrl: string;
  };
  images?: string[];
  captions?: {
    url: string;
    signedUrl: string;
  };
  status: Generation["status"];
  error?: string;
}

export type GenerationStateItems = Exclude<
  keyof GenerationState,
  "id" | "status" | "error"
>;

type stageCallbackMaps = Record<
  GenerationStateItems,
  (state: GenerationState, generationId: string) => Promise<GenerationState>
>;
