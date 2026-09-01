/**
 * Client-side derivative generation.
 * Originals are NEVER modified — these are additional files written to the
 * derivatives bucket purely for fast browsing.
 */

export type Derivative = { blob: Blob; width: number; height: number };
export type ImageInfo = { width: number; height: number };

const THUMB_EDGE = 480;
const PREVIEW_EDGE = 1800;

async function loadBitmap(file: File | Blob): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

function scaleTo(w: number, h: number, edge: number) {
  const ratio = Math.min(1, edge / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)) };
}

async function render(bitmap: ImageBitmap, edge: number, quality: number): Promise<Derivative> {
  const { width, height } = scaleTo(bitmap.width, bitmap.height, edge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) throw new Error("Could not encode derivative");
  return { blob, width, height };
}

export async function buildDerivatives(file: File): Promise<{
  info: ImageInfo;
  thumbnail: Derivative;
  preview: Derivative;
}> {
  const bitmap = await loadBitmap(file);
  try {
    const thumbnail = await render(bitmap, THUMB_EDGE, 0.72);
    const preview = await render(bitmap, PREVIEW_EDGE, 0.85);
    return { info: { width: bitmap.width, height: bitmap.height }, thumbnail, preview };
  } finally {
    bitmap.close?.();
  }
}

/** SHA-256 checksum. Skipped for very large files to keep the UI responsive. */
export async function checksumFile(file: File, maxBytes = 256 * 1024 * 1024) {
  if (file.size > maxBytes || !globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
