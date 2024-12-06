import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { db } from "@/db/db";

const { YT_CLIENT_ID, YT_CLIENT_SECRET, NEXT_PUBLIC_BASE_URL } = process.env;
export class YoutubeService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client({
      clientId: YT_CLIENT_ID,
      clientSecret: YT_CLIENT_SECRET,
      redirectUri: `${NEXT_PUBLIC_BASE_URL}/api/auth/yt/callback`,
    });
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ],
      prompt: "consent",
    });
  }

  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async uploadVideo({
    videoUrl,
    title,
    description,
    generationId,
    userId,
    privacyStatus = "public",
    tags = [],
  }: {
    videoUrl: string;
    title: string;
    description: string;
    generationId: string;
    userId: string;
    privacyStatus?: "public" | "private" | "unlisted";
    tags?: string[];
  }) {
    const credentials = await db.query.youtubeCredentialsTable.findFirst({
      where: (creds, { eq }) => eq(creds.userId, userId),
    });

    if (!credentials) {
      throw new Error("Youtube credentials not found");
    }

    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    const yt = google.youtube({ version: "v3", auth: this.oauth2Client });

    try {
      const response = await fetch(videoUrl);

      if (!response.ok || !response.body) {
        throw new Error("Video not found");
      }

      const contentLength = response.headers.get("content-length");

      const shortDescription = `#Shorts\n\n${description}`;
      const shortTags = ["Shorts", "YoutubeShorts", ...tags];

      const res = await yt.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: title.substring(0, 100),
            description: shortDescription,
            tags: shortTags,
            categoryId: "22",
          },
          status: {
            privacyStatus,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: response.body,
        },
      });

      if (!res.data.id) {
        throw new Error(
          "Failed to upload video or the video is uploaded but the id is not returned"
        );
      }

      //   TODO: Maybe make a DB record for the upload

      return {
        videoId: res.data.id,
        videoUrl: `https://www.youtube.com/watch?v=${res.data.id}`,
        shortUrl: `https://youtube.com/shorts/${res.data.id}`,
        status: res.data.status,
        privacyStatus: res.data?.status?.privacyStatus,
        ...res.data,
      };
    } catch (error) {
      console.error("Error uploading video:", error);
      throw error;
    }
  }

  async getChannelId() {
    const yt = google.youtube({ version: "v3", auth: this.oauth2Client });

    const response = await yt.channels.list({
      part: ["id"],
      mine: true,
    });

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].id;
    } else {
      throw new Error("Channel not found for the authenticated user");
    }
  }
}
