import { getAllGenerations } from "@/db/db-fns";
import { GenerationViewType } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { r2, makeSignedUrl } from "@/lib/r2";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const allGenerations = cache(async (userGoogleId: string) => {
  const generations = await getAllGenerations(userGoogleId);
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

type GenerationViewProp = Omit<GenerationViewType[number], "images"> & {
  images: string;
};
export function GenerationsPreview({
  generation,
}: {
  generation: GenerationViewProp;
}) {
  return (
    <Link
      href={`/history/${generation.configId}`}
      className="block transition-transform hover:scale-105"
    >
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
          <div className="relative h-48 min-w-52">
            <Image
              src={generation.images}
              alt={generation.topic!}
              layout="fill"
              objectFit="cover"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <CardTitle className="text-lg font-bold line-clamp-1">
            {generation.topic}
          </CardTitle>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <Badge
            className="flex items-center gap-1 justify-center"
            variant={"secondary"}
          >
            <Clock className="size-4" />
            <span className="text-sm font-medium flex-1">
              {(generation?.duration! / 1000).toFixed(1) || "??"}s
            </span>
          </Badge>
        </CardFooter>
      </Card>
    </Link>
  );
}

export async function History({ userGoogleId }: { userGoogleId: string }) {
  const gen = await allGenerations(userGoogleId);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3  gap-6">
      {gen.map((gen) => (
        <GenerationsPreview generation={gen} key={gen.id} />
      ))}
    </div>
  );
}
