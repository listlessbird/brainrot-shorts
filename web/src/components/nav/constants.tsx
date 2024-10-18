import { HomeIcon, VideoIcon } from "lucide-react";
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
    title: "generations",
    path: "/history",
    icon: <VideoIcon />,
  },
];