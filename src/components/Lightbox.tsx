import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { DERIVATIVES_BUCKET, downloadOriginal, signPath } from "@/lib/storage";
import { formatBytes, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { PhotoRecord } from "@/components/PhotoGrid";

export function Lightbox({
  photos,
  index,
  onClose,
  onIndexChange,
}: {
  photos: PhotoRecord[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const photo = photos[index];
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    const path = photo?.preview_path ?? photo?.thumbnail_path;
    if (!path) return;
    void signPath(DERIVATIVES_BUCKET, path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [photo?.preview_path, photo?.thumbnail_path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange(Math.min(photos.length - 1, index + 1));
      if (e.key === "ArrowLeft") onIndexChange(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndexChange]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-4 text-background">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{photo.file_name}</p>
          <p className="text-xs opacity-70">
            {formatDate(photo.created_at)} · {formatBytes(photo.size_bytes)}
            {photo.width && photo.height ? ` · ${photo.width}×${photo.height}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void downloadOriginal(photo.original_path, photo.file_name)}
          >
            <Download className="mr-2 size-4" /> Original
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-5 text-background" />
          </Button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-6">
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-2 z-10"
          disabled={index === 0}
          onClick={() => onIndexChange(index - 1)}
          aria-label="Previous photo"
        >
          <ChevronLeft className="size-6 text-background" />
        </Button>
        {url ? (
          <img
            src={url}
            alt={photo.caption ?? photo.file_name}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="text-sm text-background/70">Loading…</div>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 z-10"
          disabled={index >= photos.length - 1}
          onClick={() => onIndexChange(index + 1)}
          aria-label="Next photo"
        >
          <ChevronRight className="size-6 text-background" />
        </Button>
      </div>
    </div>
  );
}
