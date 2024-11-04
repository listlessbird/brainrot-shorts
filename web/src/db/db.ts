import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DB_URL!);
export const db = drizzle(client, {
  schema,
  // logger: process.env.NODE_ENV === "development" ? true : false,
});
