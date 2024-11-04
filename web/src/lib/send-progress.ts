interface ProgressUpdate {
  message: string;
  status: "info" | "error" | "success";
  timestamp: number;
}

export async function sendProgress(
  message: string,
  status: ProgressUpdate["status"] = "info"
) {
  const update: ProgressUpdate = {
    message,
    status,
    timestamp: Date.now(),
  };

  console.log("Sending progress update:", update);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL!}/api/progress/`,
      {
        method: "POST",
        body: JSON.stringify(update),
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      console.error("Failed to send progress update:", await response.text());
    }
  } catch (error) {
    console.error("Error sending progress update:", error);
  }
}
