import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "@/db/schema";

const { CF_ID, D1_ID, D1_KEY } = process.env;

export const db = drizzle(
  async (sql, params, method) => {
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env
      .CF_ID!}/d1/database/${D1_ID!}/query`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${D1_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params, method }),
    });

    const data = await res.json();

    // console.log("Response from cloudflare d1:", res);
    console.log("Response from sqlite proxy server:", data);

    if (res.status !== 200)
      throw new Error(
        `Error from sqlite proxy server: ${res.status} ${
          res.statusText
        }\n${JSON.stringify(data)}`
      );
    if (data.errors.length > 0 || !data.success)
      throw new Error(
        `Error from sqlite proxy server: \n${JSON.stringify(data)}}`
      );

    const qResult = data.result[0];

    if (!qResult.success)
      throw new Error(
        `Error from sqlite proxy server: \n${JSON.stringify(data)}`
      );

    // https://orm.drizzle.team/docs/get-started-sqlite#http-proxy
    return { rows: qResult.results.map((r: any) => Object.values(r)) };
  },
  { schema }
);
