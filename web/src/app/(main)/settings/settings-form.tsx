"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { YoutubeConnectionStatus } from "@/app/(main)/settings/yt-conn-status";

export function SettingsForm() {
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
          <YoutubeConnectionStatus />
        </CardContent>
      </Card>
    </div>
  );
}
