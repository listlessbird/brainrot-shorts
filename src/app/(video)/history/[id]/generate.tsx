"use client";

import { startGeneration } from "@/app/(video)/history/[id]/action";
import { Button } from "@/components/ui/button";
import { GeneratedAssetType } from "@/types";
import { useTransition } from "react";

export function Generate({ asset }: { asset: GeneratedAssetType }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      onClick={() => {
        startTransition(async () => {
          await startGeneration({ asset });
        });
      }}
    >
      {isPending ? "Generating..." : "Generate"}
    </Button>
  );
}
