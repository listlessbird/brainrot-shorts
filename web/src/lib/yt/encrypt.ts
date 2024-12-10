import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

function isValidKey() {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    if (ENCRYPTION_KEY) {
      console.error(
        `Invalid encryption key, length is ${ENCRYPTION_KEY.length} it must be 32 characters long
      
      Run the following command to generate a new encryption key:
      openssl rand -base64 32 | cut -c1-32      
      `
      );
    }
    throw new Error("Invalid encryption key");
  }
}
export async function encrypt(text: string): Promise<string> {
  isValidKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY as string, iv);
  const encrypted = Buffer.concat([
    // @ts-ignore
    cipher.update(text, "utf8"),
    // @ts-ignore
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  //@ts-ignore
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export async function decrypt(encryptedText: string): Promise<string> {
  isValidKey();
  const buffer = Buffer.from(encryptedText, "base64");
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY as string, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final("utf8");
}
