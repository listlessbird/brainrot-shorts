"use client";
import { Button } from "@/components/ui/button";
import { ProgressDisplay } from "./progress-display";
import { useState } from "react";

const DUMMY_MESSAGES = [
  "Starting generation process...",
  "Loading dependencies...",
  "Analyzing input data...",
  "Processing images...",
  "Running AI model...",
  "Optimizing results...",
  "Finalizing output...",
  "Success! Generation complete.",
];

export default function TestProgress() {
  const [isRunning, setIsRunning] = useState(false);

  const simulateProgress = async () => {
    setIsRunning(true);

    const sendUpdate = async (
      message: string,
      status: "info" | "success" | "error" = "info"
    ) => {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          status,
          timestamp: Date.now(),
        }),
      });
    };

    for (let i = 0; i < DUMMY_MESSAGES.length; i++) {
      const message = DUMMY_MESSAGES[i];
      const isLast = i === DUMMY_MESSAGES.length - 1;
      const status = isLast ? "success" : "info";

      await sendUpdate(message, status);

      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 2000 + 1000)
      );
    }

    if (Math.random() < 0.3) {
      await sendUpdate("An error occurred during processing!", "error");
    }

    setIsRunning(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex justify-center mb-4">
        <Button
          onClick={simulateProgress}
          disabled={isRunning}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {isRunning ? "Processing..." : "Start Dummy Process"}
        </Button>
      </div>
      <ProgressDisplay />
    </div>
  );
}
