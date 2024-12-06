"use client";
import { GenerationsPreview } from "@/app/(history)/_components/generations-preview";
import {
  useGenerationsQuery,
  useOngoingGenerationsQuery,
} from "@/app/(history)/history/queries";
import { HistoryQueryData } from "@/types";
export function History({ initialData }: { initialData: HistoryQueryData[] }) {
  const { data: generations, error: isGenerationsError } =
    useGenerationsQuery(initialData);
  const { data: ongoingGenerations, error: isOngoingError } =
    useOngoingGenerationsQuery();

  const allGenerations = [...(generations || [])];
  ongoingGenerations?.forEach((ongoing) => {
    const index = allGenerations.findIndex((g) => g.id === ongoing.id);
    if (index !== -1) {
      allGenerations[index] = ongoing;
    } else {
      allGenerations.unshift(ongoing);
    }
  });

  if (isGenerationsError || isOngoingError) {
    return (
      <div className="p-4 text-red-500">
        Failed to load generations. Please try again later.
      </div>
    );
  }

  if (!allGenerations.length) {
    return <div className="p-4 text-gray-500">No generations found.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {allGenerations.map((generation) => (
        <GenerationsPreview key={generation.id} generation={generation} />
      ))}
    </div>
  );
}
