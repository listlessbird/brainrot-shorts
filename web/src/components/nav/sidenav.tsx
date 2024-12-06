"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SideNavItems, SideNavItem } from "@/components/nav/constants";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Attr } from "@/components/nav/attr-nav";
export function SideNav() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col space-y-6 w-full">
        <div className="flex flex-col space-y-2 lg:px-6 md:px-3 pt-12">
          {SideNavItems.map((item, idx) => (
            <MenuItem key={idx} item={item} />
          ))}
        </div>
      </div>
      <div className="mt-auto">
        <Attr />
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
          `flex flex-row space-x-4 items-center p-2 rounded-lg hover:bg-accent capitalize`,
          item.path === pathname && "shadow-sm"
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
