"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ProgressDisplay() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const source = new EventSource("/api/progress");

    source.onmessage = (e) => {
      console.log("Received progress update and attempting to parse:", e.data);
      const data = JSON.parse(e.data);
      setMessages((prevMessages) => [...prevMessages, data.message]);
    };

    return () => {
      source.close();
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generation Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-start space-x-2 mb-2"
              >
                <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
