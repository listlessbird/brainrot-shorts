"use client";
import { GenerationsPreview } from "@/app/(history)/_components/generations-preview";
import {
  HistoryQueryData,
  useGenerationsQuery,
  useOngoingGenerationsQuery,
} from "@/app/(history)/history/queries";
export function History({ initialData }: { initialData: HistoryQueryData[] }) {
  const { data: generations } = useGenerationsQuery(initialData);
  const { data: ongoingGenerations } = useOngoingGenerationsQuery();

  const allGenerations = [...(generations || [])];
  ongoingGenerations?.forEach((ongoing) => {
    const index = allGenerations.findIndex((g) => g.id === ongoing.id);
    if (index !== -1) {
      allGenerations[index] = ongoing;
    } else {
      allGenerations.unshift(ongoing);
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {allGenerations.map((gen) => (
        // @ts-ignore
        <GenerationsPreview generation={gen} key={gen.id} />
      ))}
    </div>
  );
}
