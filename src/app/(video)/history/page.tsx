import { History } from "@/app/(video)/history/history";
import { VideoConfigForm } from "@/app/(video)/new-video-form";
import { QueryProvider } from "@/app/query-provider";
import { Header } from "@/components/nav/header";
import { HeaderMobile } from "@/components/nav/header-mobile";
import { SideNav } from "@/components/nav/sidenav";

export default function Home() {
  return (
    <div>
      <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-5xl">
        Generations
      </h1>
      {/* <VideoConfigForm /> */}
      <History />
    </div>
  );
}
