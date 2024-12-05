"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Clock, Loader2, Palette, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  createVideConfigSchema,
  CreateVideoScriptConfig,
} from "@/lib/validations";
import { ProgressDisplay } from "@/app/(main)/progress-display";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { createVideoScriptAction } from "@/app/(main)/action";
import { useGenerationStatus } from "@/hooks/use-generation-status";
import { useRouter } from "next/navigation";

const groups = [
  {
    value: "fairy-tale",
    src: "/fairy-tale.jpg",
    label: "Fairy Tale",
    description: "Magical and enchanted storybook style",
  },
  {
    value: "anime",
    src: "/anime.jpg",
    label: "Anime",
    description: "Modern Japanese animation style",
  },
  {
    value: "manga",
    src: "/manga.jpg",
    label: "Manga",
    description: "Black and white comic art style",
  },
  {
    value: "pixel",
    src: "/pixel.jpg",
    label: "Pixel Art",
    description: "Retro gaming inspired pixel graphics",
  },
];

const defaultTopics = [
  "snowwhite and her boyfriend",
  "nier and yonah",
  "link and the goblin king",
];

export function VideoConfigForm() {
  const router = useRouter();
  const [stats, showStats] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isPending, setPending] = useState(false);
  const { data: generationStatus } = useGenerationStatus(generationId);

  const [value, setValue] = useLocalStorage<CreateVideoScriptConfig>(
    "video-config-form",
    {
      duration: 30 * 1000,
      style: "",
      topic: defaultTopics[Math.floor(Math.random() * defaultTopics.length)],
    }
  );

  const form = useForm<CreateVideoScriptConfig>({
    resolver: zodResolver(createVideConfigSchema),
    defaultValues: {
      duration: value.duration,
      style: value.style,
      topic: value.topic,
    },
  });

  useEffect(() => {
    form.reset(value);
    setLoaded(true);
  }, [form, value]);

  useEffect(() => {
    if (generationStatus?.status === "complete" && generationId) {
      router.push(`/history/${generationId}`);
    }
  }, [generationStatus, generationId, router]);

  const onSubmit = async (values: CreateVideoScriptConfig) => {
    setValue(values);
    showStats(true);
    setPending(true);

    try {
      const result = await createVideoScriptAction(values);
      console.table(values);

      if (
        result &&
        "generationId" in result &&
        typeof result.generationId === "string"
      ) {
        console.log("Generation ID:", result.generationId);
        setGenerationId(result.generationId);

        if (result.isComplete) {
          router.push(`/history/${result.generationId}`);
        }
      }
    } catch (error) {
      setPending(false);
      console.error("Error submitting form:", error);
    }
    const generationId = await createVideoScriptAction(values);

    console.table(values);

    if (typeof generationId === "string") {
      console.log("Generation ID:", generationId);
      setGenerationId(generationId);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto bg-card/40">
      <CardHeader className="text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
        <CardTitle className="text-3xl font-bold tracking-tight">
          Create Your Video
        </CardTitle>
        <CardDescription className="text-white/90">
          Configure your video settings and let AI do the magic
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-lg font-medium">
                    <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
                    Topic
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Describe what you want your video to be about</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter an exciting topic for your video..."
                      className="resize-none min-h-[100px] text-lg"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-lg font-medium">
                    <Clock className="mr-2 h-5 w-5 text-purple-500" />
                    Duration
                  </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="text-lg">
                        <SelectValue placeholder="Select video length" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[30 * 1000, 60 * 1000].map((value) => (
                        <SelectItem
                          key={value}
                          value={value.toString()}
                          className="text-lg"
                        >
                          {value / 1000} seconds
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-lg font-medium">
                    <Palette className="mr-2 h-5 w-5 text-purple-500" />
                    Style
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {groups.map(({ src, value, label, description }) => (
                        <div
                          key={value}
                          className={cn(
                            "relative rounded-xl overflow-hidden cursor-pointer transition-all group",
                            "hover:ring-2 hover:ring-purple-500 hover:ring-offset-2",
                            field.value === value &&
                              "ring-2 ring-purple-500 ring-offset-2"
                          )}
                          onClick={() => field.onChange(value)}
                        >
                          <Image
                            src={src}
                            alt={label}
                            className="aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                            width={300}
                            height={300}
                          />
                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white">
                            <h3 className="font-medium text-lg">{label}</h3>
                            <p className="text-sm text-white/80">
                              {description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {stats && generationId && (
              <div className="rounded-lg border bg-card p-4">
                <ProgressDisplay generationId={generationId} />
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating your video...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Video
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
