"use client";
import Image from "next/image";
import Icon from "@/app/icon.png";
import Link from "next/link";
import { Component, ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Logo({
  width = 24,
  height = 24,
  ...props
}: {
  width?: number;
  height?: number;
} & ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "p-2 rounded-full flex items-center justify-center size-10  relative",
        props.className
      )}
      {...props}
      //   style={{ backgroundColor: "rgb(185, 71, 52)", objectFit: "contain" }}
    >
      <Image
        src={Icon}
        alt="Icon"
        width={width}
        height={height}
        className="z-[1000]"
        style={{
          filter:
            "brightness(0) saturate(100%) invert(39%) sepia(95%) saturate(1066%) hue-rotate(335deg) brightness(87%) contrast(82%)",
        }}
      />
    </div>
  );
}
