"use client";

import { ItemProgressIndicator } from "@/app/(history)/_components/item-progress-indicator";
import {
  useGenerationProgress,
  useGenerationQuery,
} from "@/app/(history)/history/(item)/[id]/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";
import { Calendar, Clock, Download, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Generate } from "@/app/(history)/history/(item)/[id]/generate";
import { createVideoScriptAction } from "@/app/(main)/action";
export function GenerationViewer({ generationId }: { generationId: string }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const {
    data: generation,
    isLoading,
    error,
  } = useGenerationQuery(generationId);

  const { messages, status } = useGenerationProgress(generationId);

  const [activeTab, setActiveTab] = useState(() =>
    generation?.status === "complete" ? "content" : "progress"
  );

  const {
    topic,
    images = [],
    script = [],
    speechUrl,
    videoUrl,
    style,
    duration,
    createdAt,
  } = generation || {};

  const handleRetry = useCallback(async () => {
    try {
      const result = await createVideoScriptAction({
        topic: topic!,
        duration: duration!,
        style: style!,
      });

      if (
        result &&
        "generationId" in result &&
        typeof result.generationId === "string"
      ) {
        setIsRetrying(true);
      }
    } catch (error) {
      console.error("Error while retrying video generation:", error);
    }
  }, [duration, style, topic]);

  useEffect(() => {
    if (generation?.status === "complete") {
      setActiveTab("content");
    }
  }, [generation?.status]);

  const progress = Math.min(
    Math.round(
      (messages?.filter((m) => m.status === "success").length / 5) * 100
    ),
    100
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold capitalize">{topic}</h1>
        <Progress value={progress} className="w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Calendar,
            label: "Created",
            value: new Date(createdAt!).toLocaleDateString(),
          },
          { icon: Clock, label: "Duration", value: `${duration! / 1000}s` },
          { icon: FileText, label: "Style", value: style },
        ].map((card, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="font-medium">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className={cn(
            "grid w-full grid-cols-2",
            generation?.status !== "complete" && "grid-cols-3"
          )}
        >
          {generation?.status !== "complete" && (
            <TabsTrigger value="progress">Progress</TabsTrigger>
          )}
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="preview" disabled={!videoUrl}>
            Preview
          </TabsTrigger>
        </TabsList>

        {generation?.status === "complete" && (
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                {messages.length > 0 && isRetrying && (
                  <ScrollArea className="h-[400px] pr-4">
                    <AnimatePresence>
                      {messages.map((msg, index) => (
                        <ItemProgressIndicator
                          key={index}
                          message={msg.message}
                          status={msg.status}
                        />
                      ))}
                    </AnimatePresence>
                  </ScrollArea>
                )}

                {messages.length === 0 && !isRetrying && (
                  <div className="flex items-center justify-center p-12">
                    <Button
                      type="submit"
                      size="lg"
                      className="text-lg bg-red-500 from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg"
                      onClick={() => handleRetry()}
                    >
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Retry
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="content">
          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px]">
                <div className="space-y-8">
                  {script!.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row gap-6"
                    >
                      {images[index] && (
                        <div className="w-full md:w-1/3">
                          <Image
                            src={images[index]}
                            alt={`Scene ${index + 1}`}
                            width={300}
                            height={200}
                            className="rounded-lg shadow-lg"
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <p className="text-lg">{item.textContent}</p>
                        <p className="text-sm text-muted-foreground italic">
                          {item.imagePrompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="p-6 space-y-3">
              <audio controls className="w-full">
                <source src={speechUrl!} type="audio/mpeg" />
              </audio>
              <video
                controls
                className="w-full rounded-lg shadow-lg"
                poster={images[0]}
              >
                <source src={videoUrl!} type="video/mp4" />
              </video>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!videoUrl && generation?.status === "complete" && (
        <Generate asset={generation} />
      )}
    </div>
  );
}
