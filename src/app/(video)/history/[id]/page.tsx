import { getAllGenerationsByConfigId } from "@/db/db-fns";
import { GeneratedAssetType } from "@/types";
import Image from "next/image";
import { cache } from "react";

import { Button } from "@/components/ui/button";

const getGeneration = cache(getAllGenerationsByConfigId);

export default async function Generation({
  params: { id },
}: {
  params: { id: string };
}) {
  const gen = await getGeneration(id);

  //   console.log(gen);

  return (
    <>
      <GeneratedAsset asset={gen} />
    </>
  );
}

function GeneratedAsset({ asset }: { asset: GeneratedAssetType }) {
  const { id, createdAt, topic, duration, style, script, images, speechUrl } =
    asset;

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
}
