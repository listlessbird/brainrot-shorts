export interface ProgressUpdate {
  generationId: string;
  message: string;
  status: "info" | "error" | "success";
  timestamp: number;
  meta?: Record<string, any>;
}

export async function sendProgress(
  generationId: string,
  message: string,
  status: ProgressUpdate["status"] = "info",
  meta: Record<string, any> = {}
) {
  const update: ProgressUpdate = {
    generationId,
    message,
    status,
    timestamp: Date.now(),
    meta,
  };

  console.log("Sending progress update:", update);

  let url = process.env.NEXT_PUBLIC_BASE_URL!;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !url.startsWith("https")) {
    url = `https://${url}`;
  }

  try {
    const response = await fetch(`${url}/api/progress/${generationId}`, {
      method: "POST",
      body: JSON.stringify(update),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send progress update:", errorText);
      throw new Error(`Failed to send progress update: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error sending progress update:", error);
    throw error;
  }
}

export const Progress = {
  info: (generationId: string, message: string, meta?: Record<string, any>) =>
    sendProgress(generationId, message, "info", meta),

  success: (
    generationId: string,
    message: string,
    meta?: Record<string, any>
  ) => sendProgress(generationId, message, "success", meta),

  error: (generationId: string, message: string, meta?: Record<string, any>) =>
    sendProgress(generationId, message, "error", meta),

  step: (
    generationId: string,
    step: string,
    totalSteps: number,
    stepNumber: number,
    meta?: Record<string, any>
  ) =>
    sendProgress(
      generationId,
      `Step ${stepNumber}/${totalSteps}: ${step}`,
      "info",
      { ...meta, step: stepNumber, totalSteps }
    ),

  phase: (generationId: string, phase: string, meta?: Record<string, any>) =>
    sendProgress(generationId, `Starting ${phase}...`, "info", {
      ...meta,
      phase,
    }),
};
