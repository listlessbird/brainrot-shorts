import { VideoConfigForm } from "@/app/(main)/video-config-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateRequest } from "@/lib/auth";
import { Sparkles, Video } from "lucide-react";

export default async function Home() {
  const { user } = await validateRequest();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
      <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <CardHeader>
          <CardTitle className="flex items-center text-3xl font-extrabold tracking-tight lg:text-4xl">
            <Sparkles className="mr-2 h-8 w-8" />
            AI Shorts Generator
          </CardTitle>
          <CardDescription className="text-white/80">
            Create stunning short videos with the power of AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            Welcome, {user?.username}! Get ready to transform your ideas into
            captivating short videos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <Video className="mr-2 h-6 w-6" />
            Create Your Video
          </CardTitle>
          <CardDescription>
            Configure your video settings and let AI do the magic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VideoConfigForm />
        </CardContent>
      </Card>
    </div>
  );
}
