import { getAllGenerationsAction } from "@/app/(history)/history/action";
import { OnGoingGenerationsType } from "@/db/generations-fns";
import { Generation } from "@/db/schema";
import { useQuery } from "@tanstack/react-query";

async function fetchOngoingGenerations() {
  const response = await fetch(`/api/generations/ongoing`);
  if (!response.ok) {
    throw new Error("Failed to fetch ongoing generations");
  }
  return response.json() as Promise<OnGoingGenerationsType>;
}

export type HistoryQueryData = {
  id: string;
  images: string[] | string;
  configId: string;
  topic: string | null;
  duration: number | null;
  status: Generation["status"];
};

export function useGenerationsQuery(initialData: HistoryQueryData[]) {
  return useQuery({
    queryKey: ["generations"],
    queryFn: () => getAllGenerationsAction(),
    initialData: initialData,
  });
}

export function useOngoingGenerationsQuery() {
  return useQuery<OnGoingGenerationsType>({
    queryKey: ["ongoing-generations"],
    queryFn: () => fetchOngoingGenerations(),
    refetchInterval: (query) => {
      if (!query.state.data?.length) return false;

      return 2000;
    },
  });
}
