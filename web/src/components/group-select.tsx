"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

export function GroupSelect<
  T extends {
    src: string;
    value: string;
  }
>({
  groups,
  value,
  setGroup,
}: {
  groups: T[];
  value: string;
  setGroup: (value: string) => void;
}) {
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="flex gap-1 md:gap-2 flex-wrap justify-around">
      {groups.map(({ src, value }) => (
        <div
          className={cn(
            "grid grid-rows-2 overflow-hidden cursor-pointer group rounded-md",
            selected === value && "outline-2 outline-blue-500 outline-double"
          )}
          key={value}
          onClick={() => {
            setSelected(value);
            setGroup(value);
          }}
        >
          <Image
            src={src}
            width={150}
            height={150}
            alt={value}
            className={cn(
              "object-cover row-span-full col-start-1 group-hover:scale-110 z-[-1] transition-all rounded-md"
            )}
          />
          {/* <div className="p-2 bg-white row-start-2 col-start-1 col-end-1 size-fit self-end justify-self-center font-semibold  w-full bg-opacity-25 text-center">
            {value}
          </div> */}
        </div>
      ))}
    </div>
  );
}
