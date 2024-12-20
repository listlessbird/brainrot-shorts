import { HistoryWrap } from "@/app/(history)/history/history";
import { Suspense } from "react";
import Loading from "@/app/(history)/history/shell";
import { validateRequest } from "@/lib/auth";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { user } = await validateRequest();

  if (!user) return {};

  return {
    title: `${user.username} 's generations`,
    description: `${user.username}'s generations in sparkles`,
  };
}

export default async function Home() {
  const { user } = await validateRequest();

  return (
    <div>
      <div className="my-4 flex flex-wrap gap-2 md:gap-4 items-center justify-center">
        <div className="space-y-4">
          <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-5xl">
            Generations
          </h1>
          <Suspense fallback={<Loading />}>
            <HistoryWrap userGoogleId={user.googleId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
