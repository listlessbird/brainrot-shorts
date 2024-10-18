import { getAllGenerations } from "@/db/db-fns";
import { GenerationViewType } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { r2, makeSignedUrl } from "@/lib/r2";

const allGenerations = cache(async () => {
  const generations = await getAllGenerations();
  const presignImages = generations.map(async (generation) => {
    const rand = Math.floor(Math.random() * generation.images.length);
    const key =
      generation.configId +
      "/images/" +
      generation.images[rand].split("/").pop();
    return makeSignedUrl(r2, key);
  });

  const presignedImages = await Promise.all(presignImages);

  return generations.map((genreation, index) => {
    return { ...genreation, images: presignedImages[index] };
  });
});

export async function History() {
  const gen = await allGenerations();
  console.log(gen);
  return (
    <>
      {gen.map((gen) => (
        <GenerationsPreview generation={gen} key={gen.id} />
      ))}
    </>
  );
}

type GenerationViewProp = Omit<GenerationViewType[number], "images"> & {
  images: string;
};

function GenerationsPreview({
  generation,
}: {
  generation: GenerationViewProp;
}) {
  return (
    <Link href={`/history/${generation.configId}`} className="contents">
      <div className="max-w-sm bg-card p-4 rounded-lg shadow w-[min(200px,100%)]">
        <Image
          src={generation.images}
          alt="image"
          width={250}
          height={250}
          className="w-full object-cover rounded-lg"
        />
        <div className="space-y-2">
          <h2 className="text-xl font-bold truncate">{generation.topic}</h2>
          <p className="text-sm">{generation?.duration! / 1000} seconds</p>
        </div>
      </div>
    </Link>
  );
}
