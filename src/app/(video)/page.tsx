import { VideoConfigForm } from "@/app/(video)/new-video-form";
import { QueryProvider } from "@/app/query-provider";
import { Header } from "@/components/nav/header";
import { HeaderMobile } from "@/components/nav/header-mobile";
import { SideNav } from "@/components/nav/sidenav";

export default function Home() {
  return (
    <QueryProvider>
      <div className="flex">
        <SideNav />
        <main className="min-h-screen flex-1 px-3">
          <Header />
          <HeaderMobile />
          <div className="space-y-8  max-w-2xl mx-auto pt-5">
            <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-5xl">
              Ai shorts generator
            </h1>
            <VideoConfigForm />
          </div>
        </main>
      </div>
    </QueryProvider>
  );
}
