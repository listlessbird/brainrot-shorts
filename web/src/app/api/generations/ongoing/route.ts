import { getOngoingGenerations } from "@/db/generations-fns";
import { validateRequest } from "@/lib/auth";
import { makeSignedUrl, r2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { user } = await validateRequest();

  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  try {
    const onGoingGenerations = await getOngoingGenerations(user.googleId);

    const generationsWithSignedUrls = await Promise.all(
      onGoingGenerations.map(async (generation) => {
        if (generation.images.length === 0) {
          return {
            ...generation,
            images: "/sparkles-placeholder.png",
          };
        }

        const rand = Math.floor(Math.random() * generation.images.length);
        const key =
          generation.configId +
          "/images/" +
          generation.images[rand].split("/").pop();

        const signedUrl = await makeSignedUrl(r2, key);

        return {
          ...generation,
          images: signedUrl,
        };
      })
    );

    return NextResponse.json(generationsWithSignedUrls);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error fetching ongoing generations",
      },
      { status: 500 }
    );
  }
}
