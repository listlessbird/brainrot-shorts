"use client";

import { useEffect, useState } from "react";

export function ProgressDisplay() {
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const source = new EventSource("/api/progress");

    source.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setProgress(data.message);
    };

    return () => {
      source.close();
    };
  }, []);

  if (!progress) return null;

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-md">
      <h3 className="font-semibold">Progress:</h3>
      <p>{progress}</p>
    </div>
  );
}
