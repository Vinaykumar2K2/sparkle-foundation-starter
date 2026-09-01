import { supabase } from "@/integrations/supabase/client";

export const ORIGINALS_BUCKET = "family-originals";
export const DERIVATIVES_BUCKET = "family-derivatives";
export const SELFIES_BUCKET = "family-selfies";

const cache = new Map<string, { url: string; expires: number }>();

/** Batch-sign private storage paths, with a short in-memory cache. */
export async function signPaths(
  bucket: string,
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];

  for (const p of paths) {
    const hit = cache.get(`${bucket}:${p}`);
    if (hit && hit.expires > now) out[p] = hit.url;
    else missing.push(p);
  }

  if (missing.length) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(missing, expiresIn);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) {
        out[row.path] = row.signedUrl;
        cache.set(`${bucket}:${row.path}`, {
          url: row.signedUrl,
          expires: now + (expiresIn - 60) * 1000,
        });
      }
    }
  }
  return out;
}

export async function signPath(bucket: string, path: string, expiresIn = 3600) {
  const map = await signPaths(bucket, [path], expiresIn);
  return map[path] ?? null;
}

/** Downloads the untouched original file. */
export async function downloadOriginal(path: string, fileName: string) {
  const { data, error } = await supabase.storage.from(ORIGINALS_BUCKET).download(path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadMany(items: { path: string; fileName: string }[]) {
  for (const item of items) {
    await downloadOriginal(item.path, item.fileName);
    await new Promise((r) => setTimeout(r, 350));
  }
}
