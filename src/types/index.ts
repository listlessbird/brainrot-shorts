import { getAllGenerations } from "@/db/db-fns";
import { getAllGenerationsByConfigId } from "@/db/db-fns";

export type GenerationViewType = Awaited<ReturnType<typeof getAllGenerations>>;
export type GeneratedAssetsType = Awaited<
  ReturnType<typeof getAllGenerationsByConfigId>
>;
