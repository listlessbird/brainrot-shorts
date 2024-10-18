import { VideoConfigForm } from "@/app/(main)/new-video-form";
import { QueryProvider } from "@/app/query-provider";
import { Header } from "@/components/nav/header";
import { HeaderMobile } from "@/components/nav/header-mobile";
import { SideNav } from "@/components/nav/sidenav";
import { validateRequest } from "@/lib/auth";

export default async function Home() {
  const { user } = await validateRequest();

  return (
    <div className="space-y-8  max-w-2xl mx-auto pt-5">
      <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-5xl">
        Ai shorts generator
      </h1>
      <VideoConfigForm />
    </div>
  );
}
