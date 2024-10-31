import { getAllGenerationsByConfigId } from "@/db/db-fns";
import { GeneratedAssetType } from "@/types";
import Image from "next/image";
import { cache } from "react";
import { r2, makeSignedUrl } from "@/lib/r2";
import { Generate } from "@/app/(main)/history/[id]/generate";
import { notFound } from "next/navigation";
import { validateRequest } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Download, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const getGeneration = cache(async (id: string, userGoogleId: string) => {
  const generations = await getAllGenerationsByConfigId(id, userGoogleId);

  if (
    !generations ||
    !generations.configId ||
    !generations.images ||
    !generations.script ||
    !generations.speechUrl
  ) {
    notFound();
  }

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
  const { user } = await validateRequest();
  const gen = await getGeneration(id, user.googleId);

  return (
    <>
      <GeneratedAsset asset={gen!} />
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
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

  const infoCards = [
    { icon: Calendar, label: "Created", value: formatDate(createdAt!) },
    { icon: Clock, label: "Duration", value: `${duration / 1000}s` },
    { icon: FileText, label: "Style", value: style },
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-6 text-pretty capitalize">
        {topic}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {infoCards.map((card, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-lg font-bold truncate">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="script" className="space-y-4">
        <TabsList>
          <TabsTrigger value="script">Script & Images</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          {videoUrl && <TabsTrigger value="video">Video</TabsTrigger>}
        </TabsList>
        <TabsContent value="script">
          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px] pr-4">
                {script!.map((item, index) => (
                  <div key={index} className="mb-8 last:mb-0">
                    <div className="flex flex-col md:flex-row items-start gap-4">
                      <Image
                        src={images![index]}
                        alt={`Scene ${index + 1}`}
                        className="w-full md:w-1/3 h-auto rounded-lg shadow-md"
                        width={300}
                        height={200}
                      />
                      <div className="flex-1">
                        <p className="text-lg mb-2">{item.textContent}</p>
                        <p className="text-sm text-muted-foreground italic">
                          {item.imagePrompt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audio">
          <Card>
            <CardContent className="p-6">
              <audio controls className="w-full">
                <source src={speechUrl!} type="audio/mpeg" />
              </audio>
              <div className="mt-4 flex justify-end">
                <Button asChild>
                  <a href={speechUrl!} download>
                    <Download className="mr-2 h-4 w-4" /> Download Audio
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {videoUrl && (
          <TabsContent value="video">
            <Card>
              <CardContent className="p-6">
                <video controls className="w-full rounded-lg">
                  <source src={videoUrl} type="video/mp4" />
                </video>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {!videoUrl && <Generate asset={asset} />}
    </div>
  );
}
