import { NextApiRequest, NextApiResponse } from "next";
import {
  createVideConfigSchema,
  CreateVideoScriptConfig,
} from "@/lib/validations";
import { generateObject } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import tts from "@google-cloud/text-to-speech";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const ttsClient = new tts.TextToSpeechClient({
  apiKey: process.env.GOOGLE_API_KEY,
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const values: CreateVideoScriptConfig = await req.json();
    const validated = createVideConfigSchema.parse(values);

    const { object } = await generateObject({
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

    const texts = object.scenes.map((s) => s.textContent).join("\n");
    const speech = await synthesizeSpeech(texts);

    if (speech.audioContent) {
      const key = crypto.randomUUID();
      // Note: You'll need to implement your own storage solution here
      // as Cloudflare's KV storage is not directly available in this context
      // const stored = await cfEnv.CF_STORAGE.put(key, speech.audioContent);
      // console.log(stored);

      // For now, we'll just return the object and the audio key
      return res.status(200).json({ ...object, audioKey: key });
    }

    return res.status(200).json(object);
  } catch (error) {
    console.error("Error in create-video-script:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
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

async function synthesizeSpeech(text: string) {
  const [response] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: { languageCode: "en-US", ssmlGender: "FEMALE" },
    audioConfig: {
      audioEncoding: "MP3",
    },
  });
  return response;
}
