import { db } from "@/db/db";
import { configTable, generationsTable } from "@/db/schema";
import { and, desc, eq, not } from "drizzle-orm";

export async function getOngoingGenerations(userGoogleId: string) {
  // const ongoing = await db.query.generationsTable.findMany({
  //   where: and(
  //     eq(generationsTable.userGoogleId, userGoogleId),
  //     not(eq(generationsTable.status, "complete")),
  //     not(eq(generationsTable.status, "failed"))
  //   ),
  //   with: {
  //     config: true,
  //   },
  //   orderBy: (generations) => [desc(generations.createdAt)],
  // });

  const ongoing = await db
    .select({
      id: generationsTable.id,
      images: generationsTable.images,
      configId: generationsTable.configId,
      topic: configTable.topic,
      duration: configTable.duration,
      status: generationsTable.status,
    })
    .from(generationsTable)
    .leftJoin(configTable, eq(generationsTable.configId, configTable.configId))
    .where(
      and(
        eq(generationsTable.userGoogleId, userGoogleId),
        not(eq(generationsTable.status, "complete")),
        not(eq(generationsTable.status, "failed"))
      )
    )
    .orderBy(desc(generationsTable.createdAt));

  console.log("ongoing:", ongoing);
  return ongoing;
}

export type OnGoingGenerationsType = Awaited<
  ReturnType<typeof getOngoingGenerations>
>;
