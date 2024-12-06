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
import {
  disconnectYoutube,
  getYoutubeStatus,
  startYoutubeFlow,
} from "@/app/(main)/settings/action";
import { Youtube } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export function SettingsForm() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  // @ts-ignore
  const justConnected = searchParams.get("yt_connected") === true;

  const { data: ytStatus, isLoading } = useQuery({
    queryKey: ["youtube-status"],
    queryFn: getYoutubeStatus,
    initialData: justConnected ? { connected: true } : undefined,
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectYoutube,
    onSuccess: () => {
      qc.setQueryData(["youtube-status"], { connected: false });
    },
    onError: (error) => {
      toast({
        title: "Error disconnecting YouTube",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleYoutubeConnection = async () => {
    if (ytStatus?.connected) {
      await disconnectMutation.mutateAsync();
    } else {
      await startYoutubeFlow();
    }
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
              {isLoading ? (
                <span className="text-muted-foreground">
                  Checking status...
                </span>
              ) : (
                <span>
                  {ytStatus?.connected ? "Connected" : "Not connected"}
                </span>
              )}
            </div>
            <Button
              variant={ytStatus?.connected ? "destructive" : "default"}
              onClick={handleYoutubeConnection}
              disabled={isLoading || disconnectMutation.isPending}
            >
              {disconnectMutation.isPending
                ? "Disconnecting..."
                : ytStatus?.connected
                ? "Disconnect"
                : "Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
