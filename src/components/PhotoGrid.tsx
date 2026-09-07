import { useEffect, useMemo, useState } from "react";
import { Check, Download, ImageOff, Trash2 } from "lucide-react";
import { DERIVATIVES_BUCKET, signPaths } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type PhotoRecord = {
  id: string;
  file_name: string;
  original_path: string;
  thumbnail_path: string | null;
  preview_path: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number;
  caption?: string | null;
  created_at: string;
  uploader_id: string | null;
  contributor_name?: string | null;
};

export function usePhotoUrls(photos: PhotoRecord[], key: "thumbnail_path" | "preview_path") {
  const paths = useMemo(
    () => photos.map((p) => p[key]).filter((p): p is string => Boolean(p)),
    [photos, key],
  );
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!paths.length) return;
    let active = true;
    void signPaths(DERIVATIVES_BUCKET, paths)
      .then((map) => {
        if (active) setUrls((prev) => ({ ...prev, ...map }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [paths.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return urls;
}

export function PhotoGrid({
  photos,
  selected,
  onToggleSelect,
  onOpen,
  onDownload,
  onDelete,
}: {
  photos: PhotoRecord[];
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onOpen: (photo: PhotoRecord) => void;
  onDownload?: (photo: PhotoRecord) => void;
  onDelete?: (photo: PhotoRecord) => void;
}) {
  const urls = usePhotoUrls(photos, "thumbnail_path");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => {
        const url = photo.thumbnail_path ? urls[photo.thumbnail_path] : undefined;
        const isSelected = selected?.has(photo.id) ?? false;
        return (
          <figure
            key={photo.id}
            className={cn(
              "group relative overflow-hidden rounded-xl bg-muted shadow-soft transition-transform duration-300 hover:-translate-y-0.5",
              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            <button
              type="button"
              onClick={() => onOpen(photo)}
              className="block aspect-square w-full"
              aria-label={`Open ${photo.file_name}`}
            >
              {url ? (
                <img
                  src={url}
                  alt={photo.caption ?? photo.file_name}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageOff className="size-5" />
                </span>
              )}
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {onToggleSelect ? (
                <button
                  type="button"
                  onClick={() => onToggleSelect(photo.id)}
                  aria-label={isSelected ? "Deselect photo" : "Select photo"}
                  className={cn(
                    "pointer-events-auto grid size-7 place-items-center rounded-full border border-white/60 bg-background/80 backdrop-blur",
                    isSelected && "border-primary bg-primary text-primary-foreground opacity-100",
                  )}
                >
                  <Check className="size-3.5" />
                </button>
              ) : (
                <span />
              )}
              <span className="flex items-center gap-1.5">
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(photo)}
                    aria-label={`Delete ${photo.file_name}`}
                    className="pointer-events-auto grid size-7 place-items-center rounded-full bg-background/80 text-destructive backdrop-blur"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
                {onDownload ? (
                  <button
                    type="button"
                    onClick={() => onDownload(photo)}
                    aria-label={`Download ${photo.file_name}`}
                    className="pointer-events-auto grid size-7 place-items-center rounded-full bg-background/80 backdrop-blur"
                  >
                    <Download className="size-3.5" />
                  </button>
                ) : null}
              </span>
            </div>
            {isSelected ? (
              <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" />
              </span>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}
