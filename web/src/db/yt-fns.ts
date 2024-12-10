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

export async function getUploadedVideosFromDb(configId: string) {
  try {
    const uploaded = await db.query.uploadedVideosTable.findFirst({
      where: (fields, operators) => {
        return operators.eq(fields.configId, configId);
      },
    });

    if (!uploaded) return null;

    return {
      title: uploaded.title,
      description: uploaded.description,
      videoUrl: uploaded.videoUrl,
    };
  } catch (error) {
    console.error("Error finding uploaded videos from db:", error);
    return null;
  }
}
