import { History } from "@/app/(main)/history/history";
import { Suspense } from "react";
import Loading from "@/app/(main)/history/shell";
import { validateRequest } from "@/lib/auth";
export default async function Home() {
  const { user } = await validateRequest();

  return (
    <div>
      <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-5xl">
        Generations
      </h1>
      {/* <VideoConfigForm /> */}
      <Suspense fallback={<Loading />}>
        <div className="my-4 flex flex-wrap gap-2">
          <History />
        </div>
      </Suspense>
    </div>
  );
}

export const dynamic = "force-dynamic";
