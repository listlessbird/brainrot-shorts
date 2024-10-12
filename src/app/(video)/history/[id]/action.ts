"use server";

import { GeneratedAssetType } from "@/types";

export async function startGeneration({
  asset,
}: {
  asset: GeneratedAssetType;
}) {
  const res = await fetch("http://localhost:3001/", {
    method: "POST",
    body: JSON.stringify(asset),
  });

  const json = await res.json();

  console.log(json);

  return json;
}
