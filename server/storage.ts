/**
 * File storage helpers using AWS S3 SDK.
 * Configure via environment variables:
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL
 *
 * If S3 is not configured, storagePut returns a placeholder URL and logs a warning.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getS3Client(): S3Client {
  return new S3Client({
    region: ENV.s3Region,
    credentials:
      ENV.s3AccessKeyId && ENV.s3SecretAccessKey
        ? {
            accessKeyId: ENV.s3AccessKeyId,
            secretAccessKey: ENV.s3SecretAccessKey,
          }
        : undefined,
  });
}

function isS3Configured(): boolean {
  return Boolean(ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey);
}

function buildPublicUrl(key: string): string {
  if (ENV.s3PublicBaseUrl) {
    return `${ENV.s3PublicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
  return `https://${ENV.s3Bucket}.s3.${ENV.s3Region}.amazonaws.com/${key}`;
}

/**
 * Upload a file to S3.
 * Returns { key, url } where url is the public URL.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");

  if (!isS3Configured()) {
    console.warn(
      "[Storage] S3 not configured – file upload skipped. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY."
    );
    return { key, url: "" };
  }

  const client = getS3Client();
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body as any,
      ContentType: contentType,
    })
  );

  return { key, url: buildPublicUrl(key) };
}

/**
 * Get a presigned download URL for a private S3 object.
 * For public buckets, use buildPublicUrl directly.
 */
export async function storageGet(
  relKey: string,
  expiresIn = 3600
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");

  if (!isS3Configured()) {
    return { key, url: "" };
  }

  const client = getS3Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn }
  );

  return { key, url };
}
