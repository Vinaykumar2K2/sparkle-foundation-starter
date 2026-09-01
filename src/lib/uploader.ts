import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string;
const SUPABASE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;

/** Supabase Storage speaks the tus protocol — genuine resumable, chunked uploads. */
const RESUMABLE_ENDPOINT = `${SUPABASE_URL}/storage/v1/upload/resumable`;
export const CHUNK_SIZE = 6 * 1024 * 1024; // required chunk size for Supabase tus

export type ResumableHandle = {
  abort: () => Promise<void>;
};

export async function uploadResumable(opts: {
  file: File;
  bucket: string;
  path: string;
  resumeUrl?: string | null;
  onProgress: (bytesUploaded: number, bytesTotal: number) => void;
  onResumeUrl?: (url: string) => void;
  register?: (handle: ResumableHandle) => void;
}): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You need to be signed in to upload.");

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(opts.file, {
      endpoint: RESUMABLE_ENDPOINT,
      uploadUrl: opts.resumeUrl ?? undefined,
      retryDelays: [0, 1000, 3000, 6000, 12000],
      headers: {
        authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: false,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: opts.bucket,
        objectName: opts.path,
        contentType: opts.file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onShouldRetry: (err) => {
        const status = (err as { originalResponse?: { getStatus?: () => number } })
          ?.originalResponse?.getStatus?.();
        return status !== 400 && status !== 403 && status !== 409;
      },
      onAfterResponse: (_req, res) => {
        const location = res.getHeader("Location");
        if (location && opts.onResumeUrl) opts.onResumeUrl(location);
      },
      onProgress: (bytesUploaded, bytesTotal) => opts.onProgress(bytesUploaded, bytesTotal),
      onSuccess: () => resolve(),
      onError: (error) => reject(error),
    });

    opts.register?.({
      abort: async () => {
        await upload.abort();
      },
    });

    // Resume from a previous, interrupted attempt when one is on record.
    void upload.findPreviousUploads().then((previous) => {
      if (previous.length && !opts.resumeUrl) upload.resumeFromPreviousUpload(previous[0]!);
      upload.start();
    });
  });
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}
