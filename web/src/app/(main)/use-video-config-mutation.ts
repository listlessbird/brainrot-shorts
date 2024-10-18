"use client";

import { createVideoScriptAction } from "@/app/(main)/action";
import { useMutation } from "@tanstack/react-query";

export function useVideoConfigMutation() {
  const mutation = useMutation({
    mutationFn: createVideoScriptAction,
  });

  return mutation;
}
