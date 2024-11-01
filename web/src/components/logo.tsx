import Image from "next/image";

export function Logo() {
  return (
    <div
      className="p-2 rounded-full flex items-center justify-center size-10 bg-zinc-300"
      //   style={{ backgroundColor: "rgb(185, 71, 52)", objectFit: "contain" }}
    >
      <Image
        src="/icon.png"
        alt="Icon"
        width={24}
        height={24}
        style={{
          filter:
            "brightness(0) saturate(100%) invert(39%) sepia(95%) saturate(1066%) hue-rotate(335deg) brightness(87%) contrast(82%)",
        }}
      />
    </div>
  );
}
