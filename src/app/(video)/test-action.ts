"use server";

import { CreateVideoScriptConfig } from "@/lib/validations";

import { getRequestContext } from "@cloudflare/next-on-pages";

export async function testAction(values: CreateVideoScriptConfig) {
  console.log("testAction", values);
  const ctx = getRequestContext().env;

  console.log(ctx);

  return {
    ...values,
  };
}
