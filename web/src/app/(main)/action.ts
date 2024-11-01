"use server";

import {
  createVideConfigSchema,
  CreateVideoScriptConfig,
} from "@/lib/validations";
import { generateObject } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AssemblyAI } from "assemblyai";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import Replicate from "replicate";
import Together from "together-ai";
import { Readable } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";
import {
  getConfigByParams,
  getGenerationByConfigId,
  storeConfig,
  storeGeneration,
  storeScript,
} from "@/db/db-fns";
import { makeSignedUrl } from "@/lib/r2";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import pQueue from "p-queue";
import { delay } from "@/lib/utils";

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
  NEXT_PUBLIC_BASE_URL,
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

const generateSessionId = () => `session-${crypto.randomUUID().slice(0, 4)}`;

interface ProgressUpdate {
  message: string;
  status: "info" | "error" | "success";
  timestamp: number;
}

async function sendProgress(
  message: string,
  status: ProgressUpdate["status"] = "info"
) {
  const update: ProgressUpdate = {
    message,
    status,
    timestamp: Date.now(),
  };

  await fetch(`${NEXT_PUBLIC_BASE_URL}/api/progress/`, {
    method: "POST",
    body: JSON.stringify(update),
    headers: { "Content-Type": "application/json" },
  });
}

export async function createVideoScriptAction(values: CreateVideoScriptConfig) {
  const { user } = await getCurrentSession();

  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  console.log(
    "Starting createVideoScriptAction",
    JSON.stringify(values, null, 2)
  );
  const sessionId = generateSessionId();
  console.log("Generated session ID:", sessionId);

  // return;

  let configId: string;

  try {
    const validated = createVideConfigSchema.parse(values);
    console.log("Input validation successful");

    const existingConfig = await getConfigByParams(validated, user.googleId);
    if (existingConfig) {
      console.log("Existing configuration found");
      const existingGeneration = await getGenerationByConfigId(
        existingConfig.config.id,
        user.googleId
      );
      if (existingGeneration) {
        console.log("Existing generation found, returning cached result");
        return {
          ...existingConfig.script?.script,
          images: existingGeneration.images,
          audio: existingGeneration.speechUrl,
          captions: existingGeneration.captions_url,
          sessionId: existingGeneration.id,
        };
      }
    }

    configId = await storeConfig(sessionId, validated, user.googleId);
    console.log("Stored configuration with ID:", configId);

    await sendProgress("Generating script");
    const { object } = await generateScriptWithAI(validated);
    console.log(
      "AI script generation complete",
      JSON.stringify({ object }, null, 2)
    );

    const scriptId = await storeScript(object.scenes, configId, user.googleId);
    console.log("Stored script with ID:", scriptId);

    const fullText = object.scenes.map((s) => s.textContent).join(" ");

    const [speech, images] = await Promise.all([
      synthesizeSpeech(fullText, GOOGLE_API_KEY!),
      generateImages(
        object.scenes.map((s) => s.imagePrompt),
        sessionId
      ),
    ]);

    console.log("Speech synthesis and image generation complete");

    const audioUploadResult = await uploadAudioToR2(
      speech.audioContent,
      sessionId
    );
    console.log("Audio uploaded", audioUploadResult);

    const captions = await generateCaptions(audioUploadResult.signedUrl);
    const captionUrl = captions.words
      ? await uploadCaptionsToR2(captions.words, sessionId)
      : null;

    const generationId = await storeGeneration({
      speechUrl: audioUploadResult.url,
      captionsUrl: captionUrl?.url || null,
      images: images,
      configId: configId,
      scriptId: scriptId,
      userGoogleId: user.googleId,
    });
    console.log("Stored generation with ID:", generationId);

    await sendProgress("Script generation completed successfully", "success");

    // return {
    //   ...object,
    //   images,
    //   audio: audioUploadResult.signedUrl,
    //   captions: captionUrl,
    //   sessionId: generationId,
    // };
  } catch (error) {
    console.error("Error in createVideoScriptAction", error);
    await sendProgress(
      `Error in video generation: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "error"
    );
    throw error;
  }
  redirect(`/history/${configId}`);
}

async function generateScriptWithAI(validated: CreateVideoScriptConfig) {
  console.log("Generating script with AI");
  await sendProgress("Generating script");
  return generateObject({
    model: google("gemini-1.5-pro-latest", { structuredOutputs: true }),
    schema: z.object({
      scenes: z.array(
        z.object({
          imagePrompt: z.string(),
          textContent: z.string(),
        })
      ),
    }),
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: buildPrompt(validated) },
    ],
  });
}

async function synthesizeSpeech(text: string, apiKey: string) {
  console.log("Synthesizing speech");
  await sendProgress("Synthesizing speech");
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
async function generateImages(
  prompts: string[],
  sessionId: string,
  method: "together" | "replicate" = "together"
) {
  console.log("Generating images");
  await sendProgress(`Starting generation of ${prompts.length} images`, "info");

  const generateAndUploadImage = async (prompt: string, index: number) => {
    await sendProgress(
      `Processing image ${index + 1} of ${prompts.length}`,
      "info"
    );
    console.log("Creating image from prompt:", prompt);

    try {
      if (method === "replicate") {
        const image = await createImageFromPromptReplicate(prompt);
        const outUrl = image[0];
        const upload = await uploadImageToR2(outUrl, sessionId, prompt);
        await sendProgress(`Completed image ${index + 1}`, "success");
        return upload?.url;
      } else {
        const image = await createImageFromPromptTogether(prompt);
        const outUrl = image?.[0]!;
        const upload = await uploadImageToR2(outUrl, sessionId, prompt);
        await sendProgress(`Completed image ${index + 1}`, "success");
        return upload?.url;
      }
    } catch (error) {
      await sendProgress(
        `Failed to generate/upload image ${index + 1}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
      throw error;
    }
  };

  const imagePromises = prompts.map((prompt, index) =>
    generateAndUploadImage(prompt, index)
  );

  try {
    const results = await Promise.all(imagePromises);
    await sendProgress(
      `Successfully generated all ${prompts.length} images`,
      "success"
    );
    return results;
  } catch (error) {
    await sendProgress(
      `Failed to generate all images: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "error"
    );
    throw error;
  }
}

async function createImageFromPromptReplicate(prompt: string) {
  const model =
    "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637";
  return replicate.run(model, {
    input: { prompt, num_outputs: 1, disable_safety_checker: true },
  }) as Promise<string[]>;
}

async function uploadAudioToR2(audioContent: string, sessionId: string) {
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

async function uploadImageToR2(
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

    const upload = new Upload({
      client: r2,
      params: {
        Bucket: BUCKET_NAME!,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        Metadata: {
          prompt: prompt.slice(0, 1024), // Limit metadata size
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

async function uploadCaptionsToR2(captions: any, sessionId: string) {
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

async function generateCaptions(audioUrl: string) {
  console.log("Generating captions");
  await sendProgress("Generating captions");
  return transcriber.transcripts.transcribe({
    audio_url: audioUrl,
    speech_model: "nano",
  });
}
function getSystemPrompt() {
  return `
    You're an expert at creating scripts for short videos.
    For each scene you give imagePrompt and textContent.
    Given a topic, duration and style you return script in the following json schema.

    {
        "scenes": [
            {
                imagePrompt: "You describe the scene as an image prompt",
                textContent: "You describe the scene here in text"
            }
        ]
    }
  `;
}

function buildPrompt({ duration, style, topic }: CreateVideoScriptConfig) {
  return `
    write a script to generate ${
      duration / 1000
    } second video on the topic: ${topic} 
    along with ai image prompt in ${style} format.
    For each scene give imagePrompt and textContent as fields in json format. 
    
    ONLY GIVE THE OUTPUT IN JSON FORMAT.
  `;
}

async function retryWithBackoff<T>(
  op: () => Promise<T>,
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
        await sendProgress(
          `Failed after ${maxRetries} retries ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "error"
        );
        throw error;
      }

      const delayTime = initialDelay * Math.pow(2, retries - 1);
      await sendProgress(`Retrying in ${delayTime / 1000} seconds`, "info");
      await delay(delayTime);
    }
  }
}

async function createImageFromPromptTogether(prompt: string) {
  return imageQueue.add(async () => {
    await sendProgress(
      "Queued image for generation using the TogetherAI API (may take a while)",
      "info"
    );

    try {
      const imageResponse = await retryWithBackoff(async () => {
        await sendProgress(
          "Generating image using the TogetherAI API...",
          "info"
        );

        return together.images.create({
          prompt,
          model: "black-forest-labs/FLUX.1-schnell-Free",
        });
      });

      console.log("Image response:", { imageResponse });

      return imageResponse.data.map((d) => {
        console.log("Image data:", { d });
        // @ts-ignore
        return d.url as unknown as string;
      });
    } catch (error) {
      await sendProgress(
        `Failed to generate image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
      throw error;
    }
  });
}
