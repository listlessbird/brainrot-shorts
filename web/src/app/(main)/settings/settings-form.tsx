"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startYoutubeFlow } from "@/app/(main)/settings/action";
import { Youtube } from "lucide-react";

export function SettingsForm() {
  const [youtubeConnected, setYoutubeConnected] = useState(false);

  const handleYoutubeConnection = async () => {
    await startYoutubeFlow();
    setYoutubeConnected(!youtubeConnected);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>YouTube Connection</CardTitle>
          <CardDescription>
            Manage your YouTube account connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Youtube className="size-6 text-red-600" />
              <span>{youtubeConnected ? "Connected" : "Not connected"}</span>
            </div>
            <Button
              variant={youtubeConnected ? "destructive" : "default"}
              onClick={handleYoutubeConnection}
            >
              {youtubeConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
