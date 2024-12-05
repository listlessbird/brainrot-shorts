import { getSystemPrompt, buildPrompt } from "@/lib/prompt";
import { makeSignedUrl } from "@/lib/r2";
import { CreateVideoScriptConfig } from "@/lib/validations";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { generateObject } from "ai";
import Replicate from "replicate";
import { Readable } from "stream";
import { z } from "zod";
import { Upload } from "@aws-sdk/lib-storage";
import { delay } from "@/lib/utils";
import { Progress } from "@/lib/send-progress";
import { AssemblyAI } from "assemblyai";
import Together from "together-ai";
import pQueue from "p-queue";

const {
  CF_ACCOUNT_ID,
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  BUCKET_NAME,
  ASSEMBLY_API_KEY,
  GEMINI_API_KEY,
  GOOGLE_API_KEY,
  REPLICATE_API_KEY,
  TOGETHERAI_API_KEY,
} = process.env;

const google = createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY });
const transcriber = new AssemblyAI({ apiKey: ASSEMBLY_API_KEY! });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${CF_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY!,
    secretAccessKey: R2_SECRET_KEY!,
  },
});
const replicate = new Replicate({ auth: REPLICATE_API_KEY! });
replicate.fetch = (url, options) =>
  fetch(url, { cache: "no-store", ...options });

const together = new Together({ apiKey: TOGETHERAI_API_KEY! });

const imageQueue = new pQueue({
  concurrency: 1,
  interval: 1000 * 10,
  // 6 req interval
  intervalCap: 6,
});

export async function generateScriptWithAI(
  validated: CreateVideoScriptConfig,
  generationId: string
) {
  console.log("Generating script with AI");
  await Progress.step(generationId, "Generating script", 4, 1);

  return generateObject({
    model: google("gemini-1.5-pro-latest", { structuredOutputs: true }),
    schema: z.object({
      scenes: z.array(
        z.object({
          imagePrompt: z.string(),
          textContent: z.string(),
          duration: z.number(),
        })
      ),
    }),
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: buildPrompt(validated) },
    ],
  });
}

export async function synthesizeSpeech(
  text: string,
  apiKey: string,
  generationId: string
) {
  console.log("Synthesizing speech");
  await Progress.step(generationId, "Synthesizing speech", 4, 2);
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "en-US", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });
  return response.json() as Promise<{ audioContent: string }>;
}
export async function generateImages(
  prompts: string[],
  sessionId: string,
  method: "together" | "replicate" = "together"
) {
  console.log("Generating images");

  await Progress.step(sessionId, "Generating images", 4, 3, {
    totalImages: prompts.length,
  });

  const generateAndUploadImage = async (prompt: string, index: number) => {
    await Progress.info(
      sessionId,
      `Processing image ${index + 1} of ${prompts.length}`,
      { currentImage: index + 1, totalImages: prompts.length }
    );
    console.log("Creating image from prompt:", prompt);

    try {
      if (method === "replicate") {
        const image = await createImageFromPromptReplicate(prompt);
        const outUrl = image[0];
        const upload = await uploadImageToR2(outUrl, sessionId, prompt);
        await Progress.success(sessionId, `Completed image ${index + 1}`);

        return upload?.url;
      } else {
        const image = await createImageFromPromptTogether(prompt, sessionId);
        const outUrl = image?.[0]!;
        const upload = await uploadImageToR2(outUrl, sessionId, prompt);
        await Progress.success(sessionId, `Completed image ${index + 1}`);

        return upload?.url;
      }
    } catch (error) {
      await Progress.error(
        sessionId,
        `Failed to generate/upload image ${index + 1}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      throw error;
    }
  };

  const imagePromises = prompts.map((prompt, index) =>
    generateAndUploadImage(prompt, index)
  );

  try {
    const results = await Promise.all(imagePromises);
    await Progress.success(
      sessionId,
      `Successfully generated all ${prompts.length} images`
    );
    return results;
  } catch (error) {
    await Progress.error(
      sessionId,
      `Failed to generate all images: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    throw error;
  }
}

export async function createImageFromPromptReplicate(prompt: string) {
  const model =
    "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637";
  return replicate.run(model, {
    input: { prompt, num_outputs: 1, disable_safety_checker: true },
  }) as Promise<string[]>;
}

export async function uploadAudioToR2(audioContent: string, sessionId: string) {
  console.log("Uploading audio to R2");
  const key = `${sessionId}/speech/audio-${Date.now()}.mp3`;
  const buffer = Buffer.from(audioContent, "base64");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: "audio/mpeg",
  });
  await r2.send(cmd);
  const signedUrl = await makeSignedUrl(r2, key, BUCKET_NAME!);
  const url = `https://${BUCKET_NAME!}.r2.cloudflarestorage.com/${key}`;
  return { signedUrl, key, url };
}

export async function uploadImageToR2(
  imageUrl: string,
  sessionId: string,
  prompt: string
) {
  console.log("Uploading image to R2");
  try {
    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9-]/g, "");
    if (!imageUrl || !imageUrl.startsWith("http")) {
      throw new Error("Invalid image URL");
    }

    const image = await fetch(imageUrl);
    if (!image.ok) {
      throw new Error(`Failed to fetch image: ${image.statusText}`);
    }

    const contentType = image.headers.get("content-type") || "image/jpeg";
    const fileExtension = contentType.split("/")[1] || "jpg";

    const timestamp = Date.now();
    const safeFilename = `generated-${timestamp}.${fileExtension}`;

    const key = `${sanitizedSessionId}/images/${safeFilename}`.toLowerCase();

    const fileStream = Readable.from(image.body as any);

    console.log("Upload prompt", prompt);

    const upload = new Upload({
      client: r2,
      params: {
        Bucket: BUCKET_NAME!,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        Metadata: {
          prompt: prompt.replace(/[^\x20-\x7E]/g, "").slice(0, 1024),
        },
      },
    });

    await upload.done();

    const signedUrl = await makeSignedUrl(r2, key, BUCKET_NAME!, 10 * 1000);
    const url = `https://${BUCKET_NAME!}.r2.cloudflarestorage.com/${key}`;

    return { signedUrl, key, url };
  } catch (error) {
    console.error("Error uploading image to R2:", error);
    throw new Error(
      `Failed to upload image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function uploadCaptionsToR2(captions: any, sessionId: string) {
  console.log("Uploading captions to R2");
  const captionKey = `${sessionId}/transcriptions/audio.json`;
  const captionCmd = new PutObjectCommand({
    Bucket: BUCKET_NAME!,
    Key: captionKey,
    Body: JSON.stringify(captions, null, 2),
    ContentType: "application/json",
  });
  await r2.send(captionCmd);
  const signedUrl = await makeSignedUrl(r2, captionKey, BUCKET_NAME!);
  const url = `https://${BUCKET_NAME!}.r2.cloudflarestorage.com/${captionKey}`;
  return { signedUrl, url };
}

export async function generateCaptions(audioUrl: string, configId: string) {
  console.log("Generating captions");
  await Progress.step(configId, "Generating captions", 4, 4);
  return transcriber.transcripts.transcribe({
    audio_url: audioUrl,
    speech_model: "nano",
  });
}

async function retryWithBackoff<T>(
  op: () => Promise<T>,
  generationId: string,
  maxRetries: number = 3,
  initialDelay: number = 1000
) {
  let retries = 0;

  while (true) {
    try {
      return await op();
    } catch (error) {
      retries++;

      if (retries > maxRetries) {
        await Progress.error(
          generationId,
          `Failed after ${maxRetries} retries: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        throw error;
      }

      const delayTime = initialDelay * Math.pow(2, retries - 1);
      await Progress.info(
        generationId,
        `Retrying in ${delayTime / 1000} seconds`
      );

      await delay(delayTime);
    }
  }
}

export async function createImageFromPromptTogether(
  prompt: string,
  generationId: string
) {
  return imageQueue.add(async () => {
    await Progress.info(
      generationId,
      "Queued image for generation using the TogetherAI API (may take a while)"
    );
    try {
      const imageResponse = await retryWithBackoff(async () => {
        await Progress.info(
          generationId,
          "Generating image using the TogetherAI API..."
        );

        return together.images.create({
          prompt,
          model: "black-forest-labs/FLUX.1-schnell-Free",
        });
      }, generationId);

      console.log("Image response:", { imageResponse });

      return imageResponse.data.map((d) => {
        console.log("Image data:", { d });
        // @ts-ignore
        return d.url as unknown as string;
      });
    } catch (error) {
      await Progress.error(
        generationId,
        `Failed to generate image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      throw error;
    }
  });
}
