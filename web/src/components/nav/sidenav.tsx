"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SideNavItems, SideNavItem } from "@/components/nav/constants";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
export function SideNav() {
  return (
    <div
      className="md:w-16 lg:w-60 bg-background h-screen flex-1 fixed border-r border-zinc-200 hidden md:flex shadow-md"
      sp-layout="sidebar"
    >
      <div className="flex flex-col space-y-6 w-full">
        {/* <Link
          href="/"
          className="flex flex-row space-x-3 items-center justify-center lg:justify-start lg:px-6 border-b border-zinc-200 h-12 w-full"
        >
          <Logo />
        </Link> */}

        <div className="flex flex-col space-y-2  lg:px-6 md:px-3 pt-12">
          {SideNavItems.map((item, idx) => {
            return <MenuItem key={idx} item={item} />;
          })}
        </div>
      </div>
    </div>
  );
}

const MenuItem = ({ item }: { item: SideNavItem }) => {
  const pathname = usePathname();

  return (
    <div className="">
      <Link
        href={item.path}
        className={cn(
          `flex flex-row space-x-4 items-center p-2 rounded-lg hover:bg-accent`,
          item.path === pathname && "bg-zinc-100"
        )}
        title={item.title}
      >
        {item.icon}
        <span className="font-semibold text-xl lg:flex hidden">
          {item.title}
        </span>
      </Link>
    </div>
  );
};
