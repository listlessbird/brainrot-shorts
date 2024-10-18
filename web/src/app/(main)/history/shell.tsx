import { Skeleton } from "@/components/ui/skeleton";

export default async function HistoryLoading() {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4].map((e) => (
        <div className="max-w-sm animate-pulse" key={e}>
          <Skeleton className="size-[200px] mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
