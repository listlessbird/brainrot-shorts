"use server";

import {
  createVideConfigSchema,
  CreateVideoScriptConfig,
} from "@/lib/validations";

import { generateObject } from "ai";
import { z } from "zod";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { getRequestContext } from "@cloudflare/next-on-pages";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function createVideoScriptAction(values: CreateVideoScriptConfig) {
  const cfEnv = getRequestContext().env;

  const validated = createVideConfigSchema.parse(values);

  if (!validated) {
    throw Error("Invalid inputs");
  }

  const { object, response } = await generateObject({
    model: google("gemini-1.5-pro-latest", {
      structuredOutputs: true,
    }),
    schema: z.object({
      scenes: z.array(
        z.object({
          imagePrompt: z.string(),
          textContent: z.string(),
        })
      ),
    }),
    messages: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      {
        role: "user",
        content: buildPrompt(validated),
      },
    ],
  });

  console.log(response);

  console.log(object);

  const texts = object.scenes.map((s) => s.textContent).join("\n");

  const speech = await synthesizeSpeech(texts, process.env.GOOGLE_API_KEY!);
  console.log(speech);

  if (speech.audioContent) {
    const key = crypto.randomUUID();

    const binaryData = base64ToBlob(speech.audioContent, "audio/mpeg");

    console.log("binaryData", binaryData);

    const stored = await cfEnv.CF_STORAGE.put(
      `audio-${key.slice(0, 3)}.mp3`,
      binaryData,
      {
        httpMetadata: {
          contentType: "audio/mpeg",
        },
      }
    );
    console.log(stored);

    return object;
  }
  return object;
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

async function synthesizeSpeech(text: string, apiKey: string) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      // 'Content-Type': 'application/json',

      "Content-Type": "application/json; charset=utf-8",
      // Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "en-US", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });

  const json = await response.json();

  return json as { audioContent: string };
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
