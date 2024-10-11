"use server";

import {
  createVideConfigSchema,
  CreateVideoScriptConfig,
} from "@/lib/validations";
import { generateObject } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AssemblyAI } from "assemblyai";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Replicate from "replicate";
import { Readable } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";
import {
  getConfigByParams,
  getGenerationByConfigId,
  storeConfig,
  storeGeneration,
  storeScript,
} from "@/db/db-fns";

const {
  CF_ACCOUNT_ID,
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  BUCKET_NAME,
  ASSEMBLY_API_KEY,
  GEMINI_API_KEY,
  GOOGLE_API_KEY,
  REPLICATE_API_KEY,
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

const generateSessionId = () => `session-${crypto.randomUUID().slice(0, 4)}`;

const sendProgress = async (message: string) => {
  await fetch("http://localhost:3000/api/progress/", {
    method: "POST",
    body: JSON.stringify({ message }),
    headers: { "Content-Type": "application/json" },
  });
};

const makeSignedUrl = async (key: string, bucket: string, expiry = 3600) => {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiry,
  });
};

export async function createVideoScriptAction(values: CreateVideoScriptConfig) {
  console.log(
    "Starting createVideoScriptAction",
    JSON.stringify(values, null, 2)
  );
  const sessionId = generateSessionId();
  console.log("Generated session ID:", sessionId);

  try {
    const validated = createVideConfigSchema.parse(values);
    console.log("Input validation successful");

    const existingConfig = await getConfigByParams(validated);
    if (existingConfig) {
      console.log("Existing configuration found");
      const existingGeneration = await getGenerationByConfigId(
        existingConfig.config.id
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

    const configId = await storeConfig(sessionId, validated);
    console.log("Stored configuration with ID:", configId);

    await sendProgress("Generating script");
    const { object } = await generateScriptWithAI(validated);
    console.log(
      "AI script generation complete",
      JSON.stringify({ object }, null, 2)
    );

    const scriptId = await storeScript(object.scenes, configId);
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
    });
    console.log("Stored generation with ID:", generationId);

    return {
      ...object,
      images,
      audio: audioUploadResult.signedUrl,
      captions: captionUrl,
      sessionId: generationId,
    };
  } catch (error) {
    console.error("Error in createVideoScriptAction", error);
    throw error;
  }
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
async function generateImages(prompts: string[], sessionId: string) {
  console.log("Generating images");
  const generateAndUploadImage = async (prompt: string, index: number) => {
    await sendProgress(`Creating image ${index + 1} of ${prompts.length}`);
    console.log("Creating image from prompt:", prompt);
    const image = await createImageFromPrompt(prompt);
    const outUrl = image[0];
    const upload = await uploadImageToR2(outUrl, sessionId, prompt);
    return upload?.url;
  };

  const imagePromises = prompts.map((prompt, index) =>
    generateAndUploadImage(prompt, index)
  );
  return Promise.all(imagePromises);
}

async function createImageFromPrompt(prompt: string) {
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
  const signedUrl = await makeSignedUrl(key, BUCKET_NAME!);
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
    const image = await fetch(imageUrl);
    if (!image.ok)
      throw new Error(`Failed to fetch image: ${image.statusText}`);

    const fileExtension = imageUrl.split(".").pop() || "jpg";
    const contentType = image.headers.get("content-type");
    const fileStream = Readable.from(image.body as any);
    const key = `${sessionId}/images/generated-${Date.now()}.${fileExtension}`;

    const upload = new Upload({
      client: r2,
      params: {
        Bucket: BUCKET_NAME!,
        Key: key,
        Body: fileStream,
        ContentType: contentType || "image/jpeg",
        Metadata: {
          prompt: prompt,
        },
      },
    });

    await upload.done();
    const signedUrl = await makeSignedUrl(key, BUCKET_NAME!, 10 * 1000);
    const url = `https://${BUCKET_NAME!}.r2.cloudflarestorage.com/${key}`;
    return { signedUrl, key, url };
  } catch (error) {
    console.error("Error uploading image to R2", error);
    throw error;
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
  const signedUrl = await makeSignedUrl(captionKey, BUCKET_NAME!);
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
