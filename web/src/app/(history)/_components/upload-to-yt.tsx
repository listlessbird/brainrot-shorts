"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadToYTAction } from "@/lib/yt/yt-upload.action";
import { Youtube, Loader2 } from "lucide-react";
import { YoutubeConnectionStatus } from "@/app/(main)/settings/yt-conn-status";
import { Card, CardContent } from "@/components/ui/card";

export function UploadToYouTube({
  videoUrl,
  defaultTitle,
  generationId,
}: {
  videoUrl: string;
  defaultTitle: string;
  generationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "uploading" | "complete">(
    "details"
  );
  const [title, setTitle] = useState(defaultTitle || "");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleUpload = async () => {
    setStep("uploading");
    try {
      const result = await uploadToYTAction({
        videoUrl,
        title,
        description,
        generationId,
      });
      setStep("complete");
      toast({
        title: "Video uploaded successfully",
        description: `Your video is now available at ${result.shortUrl}`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        // @ts-ignore
        description: error?.message,
        variant: "destructive",
      });
      setStep("details");
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Youtube className="mr-2 h-4 w-4" />
        Upload to YouTube
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload to YouTube</DialogTitle>
            <DialogDescription>
              {step === "details" &&
                "Confirm your video details before uploading."}
              {step === "uploading" && "Uploading your video to YouTube..."}
              {step === "complete" &&
                "Your video has been uploaded successfully!"}
            </DialogDescription>
          </DialogHeader>
          <Card>
            <CardContent className="p-2">
              <YoutubeConnectionStatus />
            </CardContent>
          </Card>
          {step === "details" && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          {step === "uploading" && (
            <div className="py-4">
              <p className="text-center mt-2">
                Hang tight, this might take a while...
              </p>
            </div>
          )}
          {step === "complete" && (
            <div className="py-4">
              <p className="text-center">
                Your video is now available on YouTube!
              </p>
            </div>
          )}
          <DialogFooter>
            {step === "details" && (
              <Button type="submit" onClick={handleUpload}>
                Upload
              </Button>
            )}
            {step === "uploading" && (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading
              </Button>
            )}
            {step === "complete" && (
              <Button onClick={() => setOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
