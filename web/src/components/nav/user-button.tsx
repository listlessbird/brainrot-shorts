"use client";

import { logOut } from "@/app/(auth)/action";
import { useSession } from "@/hooks/use-session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LogOutIcon, Monitor, Moon, Sun, UserIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
export function UserButton({
  className,
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { user } = useSession();

  const queryClient = useQueryClient();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn("flex-none rounded-full", className)}
          // {...props}
        >
          <div className="h-8 w-8 rounded-full bg-zinc-300 flex items-center justify-center text-center">
            {/* <span className="font-semibold text-sm">U</span> */}
            <Image
              src={user.picture}
              alt="avatar"
              className="h-8 w-8 rounded-full"
              width={40}
              height={40}
            />
          </div>

          {/* <UserAvatar avatarUrl={user.avatarUrl} size={40} /> */}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Logged in as @{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            queryClient.clear();
            await logOut();
          }}
          className="cursor-pointer"
        >
          <LogOutIcon className="mr-2 size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
