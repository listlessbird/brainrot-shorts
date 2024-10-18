"use server";

import { CreateVideoScriptConfig } from "@/lib/validations";
import { AssemblyAI } from "assemblyai";

export async function testAction(values: CreateVideoScriptConfig) {
  console.log("testAction", values);

  console.log(process.versions);

  // const transcriber = new AssemblyAI({
  //   apiKey: process.env.ASSEMBLY_API_KEY!,
  // });

  // console.log(transcriber);

  return {
    ...values,
  };
}
