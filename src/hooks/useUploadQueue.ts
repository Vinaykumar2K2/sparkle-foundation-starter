import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildDerivatives, checksumFile } from "@/lib/derivatives";
import { safeFileName, uploadResumable, type ResumableHandle } from "@/lib/uploader";
import { DERIVATIVES_BUCKET, ORIGINALS_BUCKET } from "@/lib/storage";

export type QueueStatus = "queued" | "uploading" | "processing" | "done" | "failed" | "canceled";

export type QueueItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  uploaded: number;
  status: QueueStatus;
  error?: string | undefined;
  sessionId?: string;
  resumeUrl?: string | null;
};

export type Library = "main" | "contribution";

const CONCURRENCY = 3;

export function useUploadQueue(library: Library, contributorName?: string) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const handles = useRef(new Map<string, ResumableHandle>());
  const canceled = useRef(new Set<string>());

  const patch = useCallback((id: string, next: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    setItems((prev) => [
      ...prev,
      ...images.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        uploaded: 0,
        status: "queued" as QueueStatus,
      })),
    ]);
    return images.length;
  }, []);

  const runItem = useCallback(
    async (item: QueueItem, albumId: string | null) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      if (library === "main" && !userId) throw new Error("Only the admin can upload here");

      const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(item.file.name)}`;
      const storagePath =
        library === "main" ? `main/${base}` : `contrib/${userId ?? "guest"}/${base}`;

      patch(item.id, { status: "uploading", uploaded: 0 });

      const { data: session, error: sessionError } = await supabase
        .from("upload_sessions")
        .insert({
          uploader_id: userId,
          file_name: item.file.name,
          mime_type: item.file.type || "application/octet-stream",
          size_bytes: item.file.size,
          storage_path: storagePath,
          library,
          album_id: albumId,
          status: "uploading",
        })
        .select("id")
        .single();
      if (sessionError) throw sessionError;
      patch(item.id, { sessionId: session.id });

      let lastSync = 0;
      await uploadResumable({
        file: item.file,
        bucket: ORIGINALS_BUCKET,
        path: storagePath,
        register: (h) => handles.current.set(item.id, h),
        onResumeUrl: (url) => {
          patch(item.id, { resumeUrl: url });
          void supabase.from("upload_sessions").update({ resume_url: url }).eq("id", session.id);
        },
        onProgress: (uploaded) => {
          patch(item.id, { uploaded });
          const now = Date.now();
          if (now - lastSync > 4000) {
            lastSync = now;
            void supabase
              .from("upload_sessions")
              .update({ bytes_uploaded: uploaded })
              .eq("id", session.id);
          }
        },
      });

      patch(item.id, { status: "processing", uploaded: item.file.size });

      // Derivatives for fast browsing — the original stays byte-for-byte intact.
      let width: number | null = null;
      let height: number | null = null;
      let thumbPath: string | null = null;
      let previewPath: string | null = null;
      try {
        const { info, thumbnail, preview } = await buildDerivatives(item.file);
        width = info.width;
        height = info.height;
        thumbPath = `thumb/${storagePath}.webp`;
        previewPath = `preview/${storagePath}.webp`;
        await supabase.storage
          .from(DERIVATIVES_BUCKET)
          .upload(thumbPath, thumbnail.blob, { contentType: "image/webp", upsert: true });
        await supabase.storage
          .from(DERIVATIVES_BUCKET)
          .upload(previewPath, preview.blob, { contentType: "image/webp", upsert: true });
      } catch {
        thumbPath = null;
        previewPath = null;
      }

      const checksum = await checksumFile(item.file).catch(() => null);

      const { error: photoError } = await supabase.from("photos").insert({
        uploader_id: userId,
        contributor_name: library === "contribution" ? (contributorName?.trim() || null) : null,
        album_id: albumId,
        library,
        file_name: item.file.name,
        mime_type: item.file.type || "application/octet-stream",
        size_bytes: item.file.size,
        original_path: storagePath,
        thumbnail_path: thumbPath,
        preview_path: previewPath,
        width,
        height,
        checksum,
        upload_status: "complete",
        face_index_status: library === "main" ? "pending" : "skipped",
      });
      if (photoError) throw photoError;

      await supabase
        .from("upload_sessions")
        .update({ status: "complete", bytes_uploaded: item.file.size })
        .eq("id", session.id);

      patch(item.id, { status: "done" });
    },
    [library, patch, contributorName],
  );

  const start = useCallback(
    async (albumId: string | null) => {
      setRunning(true);
      setStartedAt((p) => p ?? Date.now());
      const snapshot = await new Promise<QueueItem[]>((resolve) =>
        setItems((prev) => {
          resolve(prev);
          return prev;
        }),
      );
      const pending = snapshot.filter((i) => i.status === "queued" || i.status === "failed");
      let cursor = 0;

      const worker = async () => {
        while (cursor < pending.length) {
          const item = pending[cursor++]!;
          if (canceled.current.has(item.id)) continue;
          try {
            await runItem(item, albumId);
          } catch (err) {
            patch(item.id, {
              status: canceled.current.has(item.id) ? "canceled" : "failed",
              error: err instanceof Error ? err.message : "Upload failed",
            });
          } finally {
            handles.current.delete(item.id);
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      setRunning(false);
    },
    [patch, runItem],
  );

  const retry = useCallback(
    (id: string) => {
      canceled.current.delete(id);
      patch(id, { status: "queued", uploaded: 0, error: undefined });
    },
    [patch],
  );

  const cancel = useCallback(
    async (id: string) => {
      canceled.current.add(id);
      await handles.current.get(id)?.abort();
      patch(id, { status: "canceled" });
    },
    [patch],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== "done"));
  }, []);

  const totalBytes = items.reduce((s, i) => s + i.size, 0);
  const uploadedBytes = items.reduce((s, i) => s + (i.status === "done" ? i.size : i.uploaded), 0);
  const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const speed = running && elapsed > 1 ? uploadedBytes / elapsed : 0;
  const eta = speed > 0 ? (totalBytes - uploadedBytes) / speed : 0;

  return {
    items,
    running,
    addFiles,
    start,
    retry,
    cancel,
    remove,
    clearFinished,
    stats: {
      totalBytes,
      uploadedBytes,
      remainingBytes: Math.max(0, totalBytes - uploadedBytes),
      speed,
      eta,
      done: items.filter((i) => i.status === "done").length,
      failed: items.filter((i) => i.status === "failed").length,
      total: items.length,
    },
  };
}
