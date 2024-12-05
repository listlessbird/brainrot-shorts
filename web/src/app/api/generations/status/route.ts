import { NextRequest, NextResponse } from "next/server";
import { getGenerationByConfigId } from "@/db/db-fns";
import { getCurrentSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { user } = await getCurrentSession();

  if (!user || !user.googleId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing generation ID", { status: 400 });
  }

  try {
    const generation = await getGenerationByConfigId(id, user.googleId);

    if (!generation) {
      return new NextResponse("Generation not found", { status: 404 });
    }

    return NextResponse.json({ status: generation.status });
  } catch (error) {
    console.error("Error fetching generation status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
