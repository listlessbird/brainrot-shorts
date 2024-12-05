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
            <SideNav />
            <main className="min-h-screen flex-1">
              <Header />
              <HeaderMobile />
              <div className="md:w-16 lg:w-60" />
              <div className="space-y-8 max-w-full mx-auto pt-5 px-3 lg:pl-16">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SessionProvider>
    </QueryProvider>
  );
}
