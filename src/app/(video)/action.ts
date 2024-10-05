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

const replicate = new Replicate({
  auth: REPLICATE_API_KEY!,
});

replicate.fetch = (url, options) => {
  return fetch(url, { cache: "no-store", ...options });
};

export async function createVideoScriptAction(values: CreateVideoScriptConfig) {
  console.log(
    "Starting createVideoScriptAction",
    JSON.stringify(values, null, 2)
  );

  try {
    const validated = createVideConfigSchema.parse(values);
    console.log("Input validation successful");

    await sendProgress("Generating script");

    const { object, response } = await generateScriptWithAI(validated);
    console.log(
      "AI script generation complete",
      JSON.stringify({ object, response }, null, 2)
    );
    await sendProgress("Synthesizing speech");

    const texts = object.scenes.map((s) => s.textContent).join("\n");
    const speech = await synthesizeSpeech(texts, GOOGLE_API_KEY!);
    console.log("Speech synthesis complete");

    const imagePrompts = object.scenes.map((s) => s.imagePrompt);

    const images = await generateImages(imagePrompts);

    console.log("image generations", images);

    if (speech.audioContent) {
      const { signedUrl, key } = await uploadAudioToR2(speech.audioContent);
      console.log("Audio uploaded to R2", { signedUrl });

      const captions = await generateCaptions(signedUrl);
      console.log("Captions generated", captions);
      // console.log(captions.words);

      if (captions.words) {
        const captionUrl = await uploadCaptionsToR2(captions.words);
        console.log("Captions uploaded to R2", { captionUrl });

        return { ...object, captions: captionUrl, audio: captions };
      }

      return { ...object, audio: signedUrl, images };
    }

    return { ...object, images };
  } catch (error) {
    console.error("Error in createVideoScriptAction", error);
    throw error;
  }
}

async function generateScriptWithAI(validated: CreateVideoScriptConfig) {
  console.log("Generating script with AI");
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

async function uploadAudioToR2(audioContent: string) {
  console.log("Uploading audio to R2");
  const key = `speech/audio-${Date.now()}.mp3`;
  // const binaryData = base64ToBlob(audioContent, "audio/mpeg");
  const buffer = Buffer.from(audioContent, "base64");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: "audio/mpeg",
  });
  await r2.send(cmd);
  const signedUrl = await makeSignedUrl(key, BUCKET_NAME!);
  return { signedUrl, key };
}

async function uploadImageToR2(imageUrl: string, key: string) {
  console.log("Uploading image to R2");

  try {
    const image = await fetch(imageUrl);

    if (!image.ok) {
      throw new Error(`Failed to fetch image: ${image.statusText}`);
    }

    const fileExtension = imageUrl.split(".").pop() || "jpg";

    const contentType = image.headers.get("content-type");

    const fileStream = Readable.from(image.body as any);

    const newkey = `${key}.${fileExtension}`;

    const upload = new Upload({
      client: r2,
      params: {
        Bucket: BUCKET_NAME!,
        Key: newkey,
        Body: fileStream,
        ContentType: contentType || "image/jpeg",
      },
    });

    const result = await upload.done();

    console.log("Image uploaded to R2", result);

    const signedUrl = await makeSignedUrl(newkey, BUCKET_NAME!, 10 * 1000);
    console.log("Signed URL", signedUrl);

    return { signedUrl, key };
  } catch (error) {
    console.error("Error uploading image to R2", error);
  }
}

async function generateCaptions(audioUrl: string) {
  console.log("Generating captions");
  return await transcriber.transcripts.transcribe({
    audio_url: audioUrl,
    speech_model: "nano",
  });
}

async function uploadCaptionsToR2(captions: any) {
  console.log("Uploading captions to R2");
  const captionKey = `transcriptions/audio.json`;
  const captionCmd = new PutObjectCommand({
    Bucket: BUCKET_NAME!,
    Key: captionKey,
    Body: JSON.stringify(captions, null, 2),
    ContentType: "application/json",
  });
  await r2.send(captionCmd);
  return makeSignedUrl(captionKey, BUCKET_NAME!);
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

async function makeSignedUrl(key: string, bucket: string, expiry = 3600) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiry,
  });
}

async function createImageFromPrompt(prompt: string) {
  const model =
    "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637";

  // TODO: create a webhook
  const out = await replicate.run(model, {
    input: { prompt, num_outputs: 1, disable_safety_checker: true },
  });

  return out as string[];
}

async function generateImages(prompts: string[]) {
  try {
    const generations = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      await sendProgress(`Creating image ${i + 1} of ${prompts.length}`);
      console.log("creating image from prompt:", prompt);
      // Create image from prompt
      const image = await createImageFromPrompt(prompt);
      const outUrl = image[0];
      const upload = await uploadImageToR2(
        outUrl,
        `images/generated-${Date.now()}`
      );
      generations.push(upload?.signedUrl);
    }
    return generations;
  } catch (error) {
    console.error("Error generating images", error);
    throw error;
  }
}

async function sendProgress(message: string) {
  await fetch("http://localhost:3000/api/progress/", {
    method: "POST",
    body: JSON.stringify({ message }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
