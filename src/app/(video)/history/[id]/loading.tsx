import { Skeleton } from "@/components/ui/skeleton";

export default function GeneratedAssetLoading() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-full" />
        </div>
        <div>
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-full" />
        </div>
      </div>
      <div className="mb-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="mb-4 bg-white p-4 rounded-lg shadow">
            <div className="flex items-start">
              <Skeleton className="w-1/3 h-40 rounded mr-4" />
              <div className="w-2/3">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-6">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <div className="bg-white p-4 rounded-lg shadow">
          <Skeleton className="h-12 w-full rounded" />
        </div>
      </div>
      <div className="text-center">
        <Skeleton className="h-10 w-40 mx-auto rounded" />
      </div>
    </div>
  );
}
