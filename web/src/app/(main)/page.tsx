import { VideoConfigForm } from "@/app/(main)/video-config-form";

import { validateRequest } from "@/lib/auth";

export default async function Home() {
  const { user } = await validateRequest();

  return (
    <div className="max-w-4xl mx-auto">
      <VideoConfigForm />
    </div>
  );
}
