/**
 * S3-compatible file storage helper.
 * Works with AWS S3, Cloudflare R2, MinIO, or any S3-compatible provider.
 *
 * Required environment variables:
 *   AWS_ACCESS_KEY_ID       — Access key ID
 *   AWS_SECRET_ACCESS_KEY   — Secret access key
 *   AWS_REGION              — Region (e.g. "us-east-1", or "auto" for Cloudflare R2)
 *   AWS_S3_BUCKET           — Bucket name
 *   AWS_S3_ENDPOINT         — (Optional) Custom endpoint for R2/MinIO
 *   STORAGE_PUBLIC_URL      — Public base URL for files (e.g. "https://pub-xxx.r2.dev")
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.AWS_S3_ENDPOINT;
  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET environment variable is not set");
  return bucket;
}

function getPublicUrl(key: string): string {
  const base = process.env.STORAGE_PUBLIC_URL;
  if (base) {
    return `${base.replace(/\/+$/, "")}/${key}`;
  }
  const bucket = getBucket();
  const region = process.env.AWS_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = getBucket();
  const key = relKey.replace(/^\/+/, "");
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return { key, url: getPublicUrl(key) };
}

export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  if (process.env.STORAGE_PUBLIC_URL) {
    return { key, url: getPublicUrl(key) };
  }
  const client = getS3Client();
  const bucket = getBucket();
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  return { key, url };
}
