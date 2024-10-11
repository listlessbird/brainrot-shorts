import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
