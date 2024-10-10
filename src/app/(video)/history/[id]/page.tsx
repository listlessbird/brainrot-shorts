import { getAllGenerationsByConfigId } from "@/db/db-fns";
import { GenerationViewType, GeneratedAssetsType } from "@/types";
import Image from "next/image";
import { cache } from "react";

import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
// const generations = cache(async function () {
//   const res = await getAllGenerations();
//   return res;
// });

export default async function Generation({
  params: { id },
}: {
  params: { id: string };
}) {
  const gen = await getAllGenerationsByConfigId(id);

  //   console.log(gen);

  return (
    <>
      <VideoSessionDisplay assets={gen} />
      {/* <div>
        <p>{id}</p>
      </div>
      <pre>
        <code>{JSON.stringify(gen, null, 2)}</code>
      </pre> */}
    </>
  );
}

// function GenerationsPreview({
//   generation,
// }: {
//   generation: GenerationViewType[number];
// }) {
//   return (
//     <div className="max-w-sm">
//       <Image src={generation.images[0]} alt="image" width={250} height={250} />
//       <div className="space-y-2">
//         <h2 className="text-xl font-bold truncate">{generation.topic}</h2>
//         <p className="text-sm">{generation?.duration / 1000} seconds</p>
//       </div>
//     </div>
//   );
// }

const VideoSessionDisplay = ({ assets }: { assets: GeneratedAssetsType }) => {
  const { id, createdAt, topic, duration, style, script, images, speechUrl } =
    assets;

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
    }).format(new Date(dateString));
  };

  return (
    <div className="">
      <h1 className="text-3xl font-bold mb-4 text-center">{topic}</h1>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p>
            <span className="font-semibold">ID:</span> {id}
          </p>
          <p>
            <span className="font-semibold">Created:</span>{" "}
            {formatDate(createdAt)}
          </p>
        </div>
        <div>
          <p>
            <span className="font-semibold">Duration:</span> {duration / 1000}{" "}
            seconds
          </p>
          <p>
            <span className="font-semibold">Style:</span> {style}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Script & Images</h2>
        {script.map((item, index) => (
          <div key={index} className="mb-4 bg-white p-4 rounded-lg shadow">
            <div className="flex items-start">
              <Image
                src={images[index]}
                alt={`Scene ${index + 1}`}
                className="w-1/3 h-auto rounded mr-4"
                width={200}
                height={200}
              />
              <div>
                <p className="text-gray-700 mb-2">{item.textContent}</p>
                <p className="text-sm text-gray-500 italic">
                  {item.imagePrompt}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Audio</h2>
        <div className="bg-white p-4 rounded-lg shadow">
          <audio controls className="w-full">
            <source src={speechUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>

      <div className="text-center">
        <Button asChild>
          <a href={speechUrl} download>
            Download Audio
          </a>
        </Button>
      </div>
    </div>
  );
};
