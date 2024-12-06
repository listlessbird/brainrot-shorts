import { QueryProvider } from "@/app/query-provider";
import { BackgroundPatterns } from "@/components/bg-pattern";
import { Header } from "@/components/nav/header";
import { HeaderMobile } from "@/components/nav/header-mobile";
import { SideNav } from "@/components/nav/sidenav";
import { SessionProvider } from "@/hooks/use-session";
import { validateRequest } from "@/lib/auth";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();

  return (
    <QueryProvider>
      <SessionProvider value={{ user: user }}>
        <div className="min-h-screen bg-gradient-to-br from-background to-secondary relative">
          <BackgroundPatterns />
          <div className="flex relative z-10">
            <div className="hidden md:block md:w-16 lg:w-60 h-screen fixed border-r border-zinc-200 shadow-md">
              <SideNav />
            </div>
            <div className="flex-1 w-full md:pl-16 lg:pl-60">
              <main className="min-h-screen flex-1">
                <Header />
                <HeaderMobile />
                <main className="container mx-auto px-4 py-8">{children}</main>
              </main>
            </div>
          </div>
        </div>
      </SessionProvider>
    </QueryProvider>
  );
}
