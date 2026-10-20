import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { randomToken } from "./auth/tokens";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: "webp", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  "image/avif": { ext: "avif", magic: (b) => b.subarray(4, 12).toString().startsWith("ftypavi") },
};

export function uploadDir() {
  // Runtime-only location: keep the bundler from tracing the whole project into the server output.
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
}

export class UploadError extends Error {}

/** Validates type (by declared MIME *and* magic bytes) and size, then stores the file. Returns a public URL. */
export async function saveImageUpload(file: File): Promise<string> {
  if (!file || file.size === 0) throw new UploadError("Choose an image to upload");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 5 MB or smaller");
  const spec = TYPES[file.type];
  const buf = Buffer.from(await file.arrayBuffer());
  if (!spec || !spec.magic(buf)) throw new UploadError("Only JPEG, PNG, WebP or AVIF images are allowed");
  const name = `${Date.now().toString(36)}-${randomToken(9)}.${spec.ext}`;

  if (process.env.STORAGE_DRIVER === "s3") {
    const { S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL } = process.env;
    if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_BASE_URL) {
      throw new UploadError("S3 storage is not fully configured");
    }
    const client = new AwsClient({ accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, region: S3_REGION || "auto", service: "s3" });
    const res = await client.fetch(`${S3_ENDPOINT.replace(/\/$/, "")}/${S3_BUCKET}/products/${name}`, {
      method: "PUT",
      body: buf,
      headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
    if (!res.ok) throw new UploadError(`Upload failed (${res.status})`);
    return `${S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/products/${name}`;
  }

  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), buf);
  return `/api/uploads/${name}`;
}

export async function readLocalUpload(name: string): Promise<{ data: Buffer; type: string } | null> {
  if (!/^[a-z0-9]+-[A-Za-z0-9_-]+\.(jpg|png|webp|avif)$/.test(name)) return null;
  try {
    const data = await readFile(path.join(uploadDir(), name));
    const ext = name.split(".").pop()!;
    const type = Object.entries(TYPES).find(([, v]) => v.ext === ext)?.[0] ?? "application/octet-stream";
    return { data, type };
  } catch {
    return null;
  }
}
