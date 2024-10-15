import { getAllGenerationsByConfigId } from "@/db/db-fns";
import { GeneratedAssetType } from "@/types";
import Image from "next/image";
import { cache } from "react";
import { r2, makeSignedUrl } from "@/lib/r2";
import { Button } from "@/components/ui/button";
import { Generate } from "@/app/(video)/history/[id]/generate";

const getGeneration = cache(async (id: string) => {
  const generations = await getAllGenerationsByConfigId(id);
  const imagePresigningPromises = (generations.images || []).map(
    async (image) => {
      const keyFromImage = `${generations.configId}/images/${image
        .split("/")
        .pop()}`;
      return makeSignedUrl(r2, keyFromImage);
    }
  );

  const speechKey = generations.speechUrl
    ? `${generations.configId}/speech/${generations.speechUrl.split("/").pop()}`
    : null;

  const captionsKey = generations.captionsUrl
    ? `${generations.configId}/transcriptions/${generations.captionsUrl
        .split("/")
        .pop()}`
    : null;

  const videoKey = generations.videoUrl
    ? `${generations.configId}/video/${generations.videoUrl.split("/").pop()}`
    : null;

  const [
    presignedImages,
    presignedSpeechUrl,
    presignedCaptionsUrl,
    preSignedVideoUrl,
  ] = await Promise.all([
    Promise.all(imagePresigningPromises),
    speechKey ? makeSignedUrl(r2, speechKey) : null,
    captionsKey ? makeSignedUrl(r2, captionsKey) : null,
    videoKey ? makeSignedUrl(r2, videoKey) : null,
  ]);

  return {
    ...generations,
    images: presignedImages,
    speechUrl: presignedSpeechUrl,
    captionsUrl: presignedCaptionsUrl,
    videoUrl: preSignedVideoUrl,
  };
});

export default async function Generation({
  params: { id },
}: {
  params: { id: string };
}) {
  const gen = await getGeneration(id);

  return (
    <>
      <GeneratedAsset asset={gen} />
    </>
  );
}

function GeneratedAsset({ asset }: { asset: GeneratedAssetType }) {
  const {
    id,
    createdAt,
    topic,
    duration,
    style,
    script,
    images,
    speechUrl,
    videoUrl,
  } = asset;

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
    <div>
      <h1 className="text-3xl font-bold mb-4 text-pretty capitalize truncate">
        {topic}
      </h1>

      <div>
        <div className="mb-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold">ID:</span> {id}
          </p>
          <p>
            <span className="font-semibold">Created:</span>{" "}
            {formatDate(createdAt)}
          </p>
          <p>
            <span className="font-semibold">Duration:</span> {duration / 1000}{" "}
            seconds
          </p>
          <p>
            <span className="font-semibold">Style:</span> {style}
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Script & Images</h2>
          {script.map((item, index) => (
            <div key={index} className="mb-4 bg-white p-4 rounded-lg shadow">
              <div className="flex flex-col md:flex-row items-start">
                <Image
                  src={images[index]}
                  alt={`Scene ${index + 1}`}
                  className="w-1/3 h-auto rounded mr-4 "
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
            </audio>
          </div>
        </div>

        {videoUrl && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Video</h2>
            <div className="bg-white p-4 rounded-lg shadow">
              <video controls className="w-full">
                <source src={videoUrl} type="video/mp4" />
              </video>
            </div>
          </div>
        )}
        {/* 
        <div className="text-center">
          <Button asChild>
            <a href={speechUrl} download>
              Download Audio
            </a>
          </Button>
        </div> */}
        {!videoUrl && (
          <div>
            <Generate asset={asset} />
          </div>
        )}
      </div>
    </div>
  );
}
