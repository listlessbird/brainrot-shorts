import { HomeIcon, VideoIcon, Settings2Icon } from "lucide-react";
export type SideNavItem = {
  title: string;
  path: string;
  icon?: JSX.Element;
};

export const SideNavItems: SideNavItem[] = [
  {
    title: "Home",
    path: "/",
    icon: <HomeIcon />,
  },
  {
    title: "Generations",
    path: "/history",
    icon: <VideoIcon />,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: <Settings2Icon />,
  },
];
