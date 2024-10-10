import { History } from "@/app/(video)/history/history";
import { Suspense } from "react";
import Loading from "@/app/(video)/history/shell";
export default function Home() {
  return (
    <div>
      <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-5xl">
        Generations
      </h1>
      {/* <VideoConfigForm /> */}
      <Suspense fallback={<Loading />}>
        <div className="my-4">
          <History />
        </div>
      </Suspense>
    </div>
  );
}
