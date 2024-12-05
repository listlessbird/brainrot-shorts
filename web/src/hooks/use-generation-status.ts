import { useQuery } from "@tanstack/react-query";

async function fetchGenerationStatus(generationId: string) {
  const response = await fetch(`/api/generations/status?id=${generationId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch generation status");
  }
  return response.json() as Promise<{
    status:
      | "pending"
      | "script_ready"
      | "speech_ready"
      | "images_ready"
      | "captions_ready"
      | "complete"
      | "failed";
  }>;
}

export function useGenerationStatus(generationId: string | null) {
  return useQuery<{
    status:
      | "pending"
      | "script_ready"
      | "speech_ready"
      | "images_ready"
      | "captions_ready"
      | "complete"
      | "failed";
  }>({
    queryKey: ["generationStatus", generationId],
    queryFn: () => fetchGenerationStatus(generationId!),
    enabled: !!generationId,
    refetchInterval: (data) =>
      data?.state.data?.status === "complete" ? false : 1000,
    refetchIntervalInBackground: true,
  });
}
