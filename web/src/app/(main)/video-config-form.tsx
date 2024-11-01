"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Clock, Loader2, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createVideConfigSchema,
  CreateVideoScriptConfig,
} from "@/lib/validations";
import { useVideoConfigMutation } from "@/app/(main)/use-video-config-mutation";
import { ProgressDisplay } from "@/app/(main)/progress-display";
import { cn } from "@/lib/utils";

const groups = [
  { value: "fairy-tale", src: "/fairy-tale.jpg" },
  { value: "anime", src: "/anime.jpg" },
  { value: "manga", src: "/manga.jpg" },
  { value: "pixel", src: "/pixel.jpg" },
];

export function VideoConfigForm() {
  const [stats, showStats] = useState(false);

  const form = useForm<CreateVideoScriptConfig>({
    resolver: zodResolver(createVideConfigSchema),
    defaultValues: {
      duration: 30 * 1000,
      style: "fairy-tale",
      topic: "snow white and her boyfriend",
    },
  });

  const { mutate, isPending } = useVideoConfigMutation();

  const onSubmit = async (values: CreateVideoScriptConfig) => {
    showStats(true);
    console.log("Video Config:", values);

    mutate(values, {
      onSuccess(data, variables, context) {
        console.table(data);
        showStats(false);
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <Sparkles className="mr-2 h-4 w-4" />
                Topic
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the topic for your video"
                  className="resize-none"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                Describe the main subject of your video
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Duration
              </FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value.toString()}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[30 * 1000, 60 * 1000].map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      {value / 1000} seconds
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Choose the length of your video</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="style"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <Palette className="mr-2 h-4 w-4" />
                Style
              </FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {groups.map(({ src, value }) => (
                    <div
                      key={value}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all",
                        field.value === value
                          ? "ring-2 ring-primary ring-offset-0"
                          : "hover:opacity-75"
                      )}
                      onClick={() => field.onChange(value)}
                    >
                      <Image
                        src={src}
                        alt={value}
                        className="rounded-lg object-cover size-full"
                        width={200}
                        height={200}
                      />
                      {/* <div className="absolute inset-x-0 bottom-0 p-2 bg-black bg-opacity-50 text-white text-center text-sm font-medium">
                        {value}
                      </div> */}
                    </div>
                  ))}
                </div>
              </FormControl>
              <FormDescription>
                Select a visual style for your video
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {stats && <ProgressDisplay />}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Video
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
