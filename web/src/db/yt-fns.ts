import { db } from "@/db/db";
import { decrypt } from "@/lib/yt/encrypt";

export async function getYtCredentialsFromDb(userId: string) {
  try {
    const credentials = await db.query.youtubeCredentialsTable.findFirst({
      where: (creds, { eq }) => eq(creds.userId, userId),
    });

    if (!credentials) {
      return null;
    }

    const accessToken = await decrypt(credentials.encryptedAccessToken);
    const refreshToken = await decrypt(credentials.encryptedRefreshToken);

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error("Error getting youtube credentials from db:", error);
    return null;
  }
}
