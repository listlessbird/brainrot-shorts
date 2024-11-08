export const runtime = "nodejs";

import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export default async function OpenGraph() {
  const logoData = await readFile(join(process.cwd(), "/public/logo.png"));
  // @ts-ignore
  const logoSrc = Uint8Array.from(logoData).buffer;
  console.log(readFile);
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(to right bottom, rgb(244, 241, 241), rgb(254, 215, 170))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div style={{ width: "60px", height: "60px", display: "flex" }}>
            <div tw="p-2 rounded-full flex items-center justify-center size-10  relative">
              <img
                //   @ts-ignore
                src={logoSrc}
                alt="Icon"
                width={60}
                height={60}
                className="z-[1000]"
                style={{
                  filter:
                    "brightness(0) saturate(100%) invert(39%) sepia(95%) saturate(1066%) hue-rotate(335deg) brightness(87%) contrast(82%)",
                }}
              />
            </div>
          </div>

          <h1
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              letterSpacing: "-0.025em",
              background:
                "linear-gradient(to right, rgb(191, 56, 56), rgb(201, 89, 89), rgb(143, 28, 28))",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
              padding: 0,
            }}
          >
            sparkles
          </h1>
        </div>

        <p
          style={{
            fontSize: "32px",
            color: "hsl(8, 58%, 54%)",
            margin: 0,
            padding: 0,
            fontWeight: 500,
          }}
        >
          ai short video generator
        </p>
      </div>
    )
  );
}
