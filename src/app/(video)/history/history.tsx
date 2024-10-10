import { getAllGenerations } from "@/db/db-fns";
import { GenerationViewType } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";

// const generations = cache(async function () {
//   const res = await getAllGenerations();
//   return res;
// });

export async function History() {
  const gen = await getAllGenerations();

  console.log(gen);

  return (
    <>
      {gen.map((gen) => (
        <GenerationsPreview generation={gen} key={gen.id} />
      ))}
    </>
  );
}

function GenerationsPreview({
  generation,
}: {
  generation: GenerationViewType[number];
}) {
  return (
    <Link href={`/history/${generation.configId}`}>
      <div className="max-w-sm">
        <Image
          src={generation.images[0]}
          alt="image"
          width={250}
          height={250}
        />
        <div className="space-y-2">
          <h2 className="text-xl font-bold truncate">{generation.topic}</h2>
          <p className="text-sm">{generation?.duration / 1000} seconds</p>
        </div>
      </div>
    </Link>
  );
}
