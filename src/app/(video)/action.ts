"use server";

import {
  createVideConfigSchema,
  CreateVideoScriptConfig,
} from "@/lib/validations";

import { generateObject } from "ai";
import { createOpenAI as createGroq } from "@ai-sdk/openai";
import { z } from "zod";

const groq = createGroq({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export async function createVideoScriptAction(values: CreateVideoScriptConfig) {
  const validated = createVideConfigSchema.parse(values);

  if (!validated) {
    throw Error("Invalid inputs");
  }

  const { object } = await generateObject({
    model: groq("llama-3.1-70b-versatile"),
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

  console.log(object);

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
