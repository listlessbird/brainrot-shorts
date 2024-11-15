import { getGenerationAction } from "@/app/(history)/history/(item)/[id]/get-generation-action";
import { Generation } from "@/db/schema";
import { ProgressUpdate } from "@/lib/send-progress";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useGenerationQuery(id: string) {
  return useQuery({
    queryKey: ["generation-item", id],
    queryFn: () => getGenerationAction(id),
    refetchInterval: (query) => {
      return query.state.data?.status === "complete" ? false : 5 * 1000;
    },
  });
}

export function useGenerationProgress(id: string) {
  const [messages, setMessages] = useState<ProgressUpdate[]>([]);
  const [status, setStatue] = useState("pending");

  useEffect(() => {
    const eS = new EventSource(`/api/progress/${id}`);

    eS.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prevMessages) => [...prevMessages, data]);

      if (data.status === "complete" || data.status === "error") {
        setStatue(data.status);
        eS.close();
      }
    };

    return () => eS.close();
  }, [id]);

  return { messages, status };
}
