import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";

const { CF_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, BUCKET_NAME } =
  process.env;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${CF_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY!,
    secretAccessKey: R2_SECRET_KEY!,
  },
});
export async function makeSignedUrl(
  r2: S3Client,
  key: string,
  bucket: string = BUCKET_NAME!,
  expiry = 3600
) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiry,
  });
}

export async function uploadVideoToR2(videoUrl: string, sessionId: string) {
  console.log("Uploading video to R2");
  console.log("Video URL", videoUrl);
  try {
    const video = await fetch(videoUrl);
    if (!video.ok)
      throw new Error(`Failed to fetch video: ${video.statusText}`);

    const contentType = video.headers.get("content-type");
    const fileStream = Readable.from(video.body as any);
    const key = `${sessionId}/video/video-${sessionId}.mp4`;

    const upload = new Upload({
      client: r2,
      params: {
        Bucket: BUCKET_NAME!,
        Key: key,
        Body: fileStream,
        ContentType: contentType || "video/mp4",
      },
    });

    await upload.done();
    const signedUrl = await makeSignedUrl(r2, key, BUCKET_NAME!, 10 * 1000);
    const url = `https://${BUCKET_NAME!}.r2.cloudflarestorage.com/${key}`;
    return { signedUrl, key, url };
  } catch (error) {
    console.error("Error uploading video to R2", error);
    throw error;
  }
}
