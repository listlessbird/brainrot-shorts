import { VideoConfigForm } from "@/app/(main)/video-config-form";

import { validateRequest } from "@/lib/auth";

export default async function Home() {
  const { user } = await validateRequest();

  return (
    <div className="min-h-screen">
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-8 max-w-4xl">
        <VideoConfigForm />
      </div>
    </div>
  );
}
