"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProgressMessage {
  message: string;
  status: "info" | "error" | "success";
  timestamp: number;
}

export function ProgressDisplay({ generationId }: { generationId: string }) {
  const [messages, setMessages] = useState<ProgressMessage[]>([]);
  const [showTopBlur, setShowTopBlur] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
      setShowTopBlur(true);
    }
  }, [messages]);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(`/api/progress/${generationId}`);

        eventSource.onmessage = (e) => {
          try {
            console.log("Received progress update:", e.data);
            const data = JSON.parse(e.data);
            setMessages((prevMessages) => [...prevMessages, data]);
          } catch (err) {
            console.error("Error parsing SSE message:", err);
          }
        };

        eventSource.onerror = (e) => {
          console.error("SSE error:", e);
          setError("Connection lost. Retrying...");
          eventSource?.close();
          setTimeout(connectSSE, 5000);
        };

        eventSource.onopen = () => {
          setError(null);
          console.log("SSE connection established");
        };
      } catch (err) {
        console.error("Error setting up SSE:", err);
        setError("Failed to connect to progress updates");
      }
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, [generationId]);

  const getStatusColor = (status: ProgressMessage["status"]) => {
    switch (status) {
      case "error":
        return "bg-red-500";
      case "success":
        return "bg-green-500";
      default:
        return "bg-orange-500";
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setShowTopBlur(target.scrollTop > 20);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-orange-500" />
          Generation Progress
          {error && <span className="ml-2 text-sm text-red-500">{error}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea
          ref={scrollAreaRef}
          className="h-[300px] w-full rounded-md"
          onScrollCapture={handleScroll}
        >
          {showTopBlur && (
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
              <div className="h-16 bg-gradient-to-b from-background via-background/20 to-transparent" />
            </div>
          )}
          <div className="relative px-4">
            {/* Timeline track */}
            {messages.length > 0 && (
              <div
                className="absolute top-[10px] w-0.5 h-[calc(100%-20px)] bg-orange-200"
                style={{ left: "23px" }}
              />
            )}

            <AnimatePresence>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Waiting for progress updates...
                </p>
              ) : (
                <div className="relative space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${message.timestamp}-${index}`}
                      initial={{ opacity: 0, y: 20, x: 0 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="relative"
                      ref={
                        index === messages.length - 1 ? lastMessageRef : null
                      }
                    >
                      <div className="flex items-start gap-3">
                        {/* Timeline dot */}
                        <div className="relative mt-2">
                          <div className="relative size-4">
                            <div
                              className={`size-4 rounded-full ${getStatusColor(
                                message.status
                              )} z-10 relative`}
                              nd-sparkles-me="indicator"
                            />
                            {index === messages.length - 1 && (
                              <div
                                className="absolute inset-0 rounded-full animate-ping opacity-75"
                                style={{
                                  backgroundColor:
                                    message.status === "error"
                                      ? "#ef4444"
                                      : message.status === "success"
                                      ? "#22c55e"
                                      : "#f97316",
                                }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Message content */}
                        <div className="flex-1 bg-orange-50 rounded-lg p-3 shadow-sm min-w-0">
                          <p
                            className={`text-sm ${
                              message.status === "error"
                                ? "text-red-600"
                                : message.status === "success"
                                ? "text-green-600"
                                : "text-orange-800"
                            }`}
                          >
                            {message.message}
                          </p>
                          <span className="text-xs text-orange-400 mt-1 block">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
