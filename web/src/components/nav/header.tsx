"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useScroll } from "@/hooks/use-scroll";
import Image from "next/image";
import { UserButton } from "@/components/nav/user-button";
import { Logo } from "@/components/logo";
import { FaGithub } from "react-icons/fa6";
import { Github } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  const scrolled = useScroll(5);
  const selectedLayout = useSelectedLayoutSegment();

  return (
    <TooltipProvider>
      <div
        className={cn(
          `sticky inset-x-0 top-0 z-30 w-full transition-all border-b border-gray-200`,
          {
            "border-b border-gray-200 bg-background/75 backdrop-blur-lg":
              scrolled,
            "border-b border-gray-200 bg-background": selectedLayout,
          }
        )}
      >
        <div className="flex h-[47px] items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex flex-row space-x-3 items-center justify-center py-2"
            >
              <Logo />
              <span className="font-bold text-xl flex ">Sparkles</span>
            </Link>
          </div>

          <div className="hidden md:block space-x-5">
            {/* <div className="flex"> */}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/listlessbird/sparkles"
              className="inline-block"
            >
              <Tooltip>
                <TooltipTrigger>
                  <Github className="size-8" />
                </TooltipTrigger>
                <TooltipContent>View Source</TooltipContent>
              </Tooltip>
            </a>
            <UserButton />
            {/* </div> */}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
