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
import { History } from "@/app/(history)/_components/history";

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
export async function HistoryWrap({ userGoogleId }: { userGoogleId: string }) {
  const gen = await allGenerations(userGoogleId);

  return <History initialData={gen} />;
}
