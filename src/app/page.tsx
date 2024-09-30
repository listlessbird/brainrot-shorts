import { VideoConfigForm } from "@/app/(video)/new-video-form";

export default function Home() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto pt-10">
      <div className="space-y-8">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Brainrot generator
        </h1>
        <VideoConfigForm />
      </div>
    </main>
  );
}
