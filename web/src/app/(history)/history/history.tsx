import { getAllGenerations } from "@/db/db-fns";
import { cache } from "react";
import { r2, makeSignedUrl } from "@/lib/r2";
import { History } from "@/app/(history)/_components/history";

const allGenerations = cache(async (userGoogleId: string) => {
  const generations = await getAllGenerations(userGoogleId);
  const presignImages = generations.map(async (generation) => {
    if (generation.images.length > 0) {
      const key =
        generation.configId +
        "/images/" +
        generation.images[0].split("/").pop();
      return makeSignedUrl(r2, key);
    }
    return "/sparkles-placeholder.png";
  });

  const presignedImages = await Promise.all(presignImages);

  return generations.map((genreation, index) => {
    return { ...genreation, images: presignedImages[index] };
  });
});

export async function HistoryWrap({ userGoogleId }: { userGoogleId: string }) {
  const gen = await allGenerations(userGoogleId);

  return <History initialData={gen} />;
}
