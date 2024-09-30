"use client";

import { GroupSelect } from "@/components/group-select";
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
import { createVideConfigSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const groups = [
  {
    value: "fairy-tale",
    src: "/fairy-tale.jpg",
  },
  {
    value: "anime",
    src: "/anime.jpg",
  },
  {
    value: "manga",
    src: "/manga.jpg",
  },
  {
    value: "pixel",
    src: "/pixel.jpg",
  },
];

export function VideoConfigForm() {
  const form = useForm<z.infer<typeof createVideConfigSchema>>({
    resolver: zodResolver(createVideConfigSchema),
    defaultValues: {
      duration: 30 * 1000,
      style: "fairy-tale",
      topic: "brainrot",
    },
  });

  const onSubmit = () => {
    console.log("Video Config:", form.getValues());
    // TODO: Save video configuration to the database
    // or send it to the server for processing
    form.reset();
    // ...
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topic</FormLabel>
              <FormControl>
                <Textarea placeholder="topic for the video" {...field} />
              </FormControl>
              <FormDescription>The topic for the video</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value + ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[30 * 1000, 60 * 1000].map((value, index) => (
                    <SelectItem key={index} value={value + ""}>
                      {value / 1000} seconds
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The duration of the video</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="style"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video Style</FormLabel>
              <FormControl>
                <GroupSelect
                  value={field.value}
                  setGroup={field.onChange}
                  groups={groups}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-[60%]">
          Submit
        </Button>
      </form>
    </Form>
  );
}
