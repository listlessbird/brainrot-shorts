import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenerationPreview } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
type GenerationViewProp = GenerationPreview & {
  images: string | string[];
  topic: string;
  duration: number;
};
export function GenerationsPreview({
  generation,
}: {
  generation: GenerationViewProp;
}) {
  console.table(generation);

  return (
    <Link
      href={`/history/${generation.configId}`}
      className="block transition-transform hover:scale-105"
    >
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
          <div className="relative h-48 min-w-52">
            <Image
              src={
                Array.isArray(generation.images)
                  ? generation.images[0]
                  : generation.images
              }
              alt={generation.topic || "ongoing generation"}
              className="object-cover size-full"
              width={250}
              height={250}
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
              {(generation.duration / 1000).toFixed(1)}s
            </span>
          </Badge>
          <Badge
            variant={generation.status === "complete" ? "default" : "secondary"}
          >
            {generation.status}
          </Badge>
        </CardFooter>
      </Card>
    </Link>
  );
}
