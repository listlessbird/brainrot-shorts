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

const {
  CF_ACCOUNT_ID,
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  BUCKET_NAME,
  ASSEMBLY_API_KEY,
  GEMINI_API_KEY,
  GOOGLE_API_KEY,
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

export async function createVideoScriptAction(values: CreateVideoScriptConfig) {
  console.log(
    "Starting createVideoScriptAction",
    JSON.stringify(values, null, 2)
  );

  try {
    const validated = createVideConfigSchema.parse(values);
    console.log("Input validation successful");

    const { object, response } = await generateScriptWithAI(validated);
    console.log(
      "AI script generation complete",
      JSON.stringify({ object, response }, null, 2)
    );

    const texts = object.scenes.map((s) => s.textContent).join("\n");
    const speech = await synthesizeSpeech(texts, GOOGLE_API_KEY!);
    console.log("Speech synthesis complete");

    if (speech.audioContent) {
      const { signedUrl, key } = await uploadAudioToR2(speech.audioContent);
      console.log("Audio uploaded to R2", { signedUrl });

      const captions = await generateCaptions(signedUrl);
      console.log("Captions generated", captions);
      console.log(captions.words);

      if (captions.words) {
        const captionUrl = await uploadCaptionsToR2(captions.words);
        console.log("Captions uploaded to R2", { captionUrl });

        return { ...object, captions: captionUrl, audio: captions };
      }

      return { ...object, audio: signedUrl };
    }

    return object;
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

function base64ToBlob(base64: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

async function makeSignedUrl(key: string, bucket: string, expiry = 3600) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiry,
  });
}
