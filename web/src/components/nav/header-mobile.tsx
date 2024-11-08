"use client";
import { SideNavItem, SideNavItems } from "@/components/nav/constants";
import { cn } from "@/lib/utils";
import { motion, useCycle, Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { ComponentProps, ReactNode, useRef } from "react";
import { useDimensions } from "@/hooks/use-dimensions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logOut } from "@/app/(auth)/action";

const sidebarVariants: Variants = {
  open: (height: number = 1000) => ({
    clipPath: `circle(${height * 2 + 200}px at 100% 0)`,
    transition: {
      type: "spring",
      stiffness: 20,
      restDelta: 4,
    },
  }),
  closed: {
    clipPath: "circle(0px at 100% 0)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
};

const itemVariants: Variants = {
  open: {
    transition: { staggerChildren: 0.02, delayChildren: 0.15 },
  },
  closed: {
    transition: { staggerChildren: 0.01, staggerDirection: -1 },
  },
};

const MenuItemVariants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    y: 50,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 },
      duration: 0.02,
    },
  },
};

export function HeaderMobile() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, toggleOpen] = useCycle(false, true);
  const { height } = useDimensions(containerRef);

  return (
    <motion.nav
      initial={false}
      animate={open ? "open" : "closed"}
      custom={height}
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-[100] md:hidden pointer-events-none",
        open && "pointer-events-auto"
      )}
    >
      {/* Background overlay */}
      <motion.div
        variants={sidebarVariants}
        className="absolute inset-0 bg-white size-full right-0"
      />
      <motion.ul
        className="absolute grid w-full gap-2 px-10 py-16"
        variants={itemVariants}
      >
        {SideNavItems.map((item, idx) => {
          const isLastItem = idx === SideNavItems.length - 1;
          const active = item.path === pathname;
          return (
            <div key={item.title}>
              <MenuItem>
                <Link
                  href={item.path}
                  onClick={() => toggleOpen()}
                  className={cn("flex w-full text-2xl", active && "font-bold")}
                >
                  {item.title}
                </Link>
              </MenuItem>
              {!isLastItem && (
                <MenuItem className="my-3 h-px w-full bg-gray-300" />
              )}
            </div>
          );
        })}
        <MenuItem className="flex w-full text-2xl my-3 cursor-pointer">
          <Link
            href={"https://github.com/listlessbird/sparkles/"}
            target="_blank"
          >
            github
          </Link>
        </MenuItem>

        <MenuItem
          className="flex w-full text-2xl my-3 cursor-pointer"
          onClick={async () => {
            await logOut();
          }}
        >
          logout
        </MenuItem>
      </motion.ul>
      <MenuToggle toggle={toggleOpen} />
    </motion.nav>
  );
}

const MenuItem = ({
  className,
  children,
  ...props
}: {
  className?: string;
  children?: ReactNode;
} & ComponentProps<typeof motion.li>) => {
  return (
    <motion.li
      variants={MenuItemVariants}
      className={cn("capitalize", className)}
      {...props}
    >
      {children}
    </motion.li>
  );
};

const MenuToggle = ({ toggle }: { toggle: any }) => (
  <button
    onClick={toggle}
    className="pointer-events-auto absolute right-4 top-[14px] z-30"
  >
    <svg width="23" height="23" viewBox="0 0 23 23">
      <Path
        variants={{
          closed: { d: "M 2 2.5 L 20 2.5" },
          open: { d: "M 3 16.5 L 17 2.5" },
        }}
      />
      <Path
        d="M 2 9.423 L 20 9.423"
        variants={{
          closed: { opacity: 1 },
          open: { opacity: 0 },
        }}
        transition={{ duration: 0.1 }}
      />
      <Path
        variants={{
          closed: { d: "M 2 16.346 L 20 16.346" },
          open: { d: "M 3 2.5 L 17 16.346" },
        }}
      />
    </svg>
  </button>
);

const Path = (props: any) => (
  <motion.path
    fill="transparent"
    strokeWidth="2"
    stroke="hsl(0, 0%, 18%)"
    strokeLinecap="round"
    {...props}
  />
);
