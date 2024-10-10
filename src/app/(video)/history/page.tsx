import { VideoConfigForm } from "@/app/(video)/new-video-form";
import { QueryProvider } from "@/app/query-provider";
import { Header } from "@/components/nav/header";
import { HeaderMobile } from "@/components/nav/header-mobile";
import { SideNav } from "@/components/nav/sidenav";

export default function Home() {
  return (
    <div className="space-y-8  max-w-2xl mx-auto pt-5">
      <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-5xl">
        Generations
      </h1>
      <VideoConfigForm />
    </div>
  );
}
