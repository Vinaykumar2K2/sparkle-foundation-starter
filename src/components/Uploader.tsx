import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen, ImagePlus, RotateCcw, Trash2, UploadCloud, X } from "lucide-react";
import { useUploadQueue, type Library } from "@/hooks/useUploadQueue";
import { formatBytes, formatDuration, formatSpeed } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  queued: "Queued",
  uploading: "Uploading",
  processing: "Finishing",
  done: "Uploaded",
  failed: "Failed",
  canceled: "Canceled",
};

export function Uploader({
  library,
  albumId = null,
  allowFolders = false,
  contributorName,
  disabled = false,
  disabledHint,
}: {
  library: Library;
  albumId?: string | null;
  allowFolders?: boolean;
  contributorName?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const queue = useUploadQueue(library, contributorName);
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      queue.addFiles(Array.from(e.dataTransfer.files));
    },
    [queue],
  );

  const { stats } = queue;
  const overall = stats.totalBytes ? (stats.uploadedBytes / stats.totalBytes) * 100 : 0;

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => (disabled ? e.preventDefault() : onDrop(e))}
        className={cn(
          "rounded-2xl border-2 border-dashed border-border bg-card/60 p-10 text-center transition-colors",
          dragging && "border-primary bg-accent/40",
        )}
      >
        <UploadCloud className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="font-display text-lg font-semibold">Drop photos here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Uploads are chunked and resumable — an interrupted transfer picks up where it stopped,
          and originals are stored exactly as they are.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="outline" disabled={disabled} onClick={() => fileInput.current?.click()}>
            <ImagePlus className="mr-2 size-4" /> Choose files
          </Button>
          {allowFolders ? (
            <Button variant="outline" disabled={disabled} onClick={() => folderInput.current?.click()}>
              <FolderOpen className="mr-2 size-4" /> Choose folder
            </Button>
          ) : null}
        </div>
        {disabled && disabledHint ? (
          <p className="mt-3 text-sm text-destructive">{disabledHint}</p>
        ) : null}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            queue.addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          hidden
          // @ts-expect-error non-standard but widely supported directory picker
          webkitdirectory=""
          onChange={(e) => {
            queue.addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {queue.items.length ? (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {stats.done}/{stats.total} uploaded
                {stats.failed ? ` · ${stats.failed} failed` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(stats.uploadedBytes)} of {formatBytes(stats.totalBytes)} ·{" "}
                {formatBytes(stats.remainingBytes)} left · {formatSpeed(stats.speed)} · ETA{" "}
                {formatDuration(stats.eta)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  await queue.start(albumId);
                  await queryClient.invalidateQueries();
                }}
                disabled={queue.running}
              >
                {queue.running ? "Uploading…" : "Start upload"}
              </Button>
              <Button variant="ghost" onClick={queue.clearFinished} disabled={queue.running}>
                <Trash2 className="mr-2 size-4" /> Clear done
              </Button>
            </div>
          </div>

          <Progress value={overall} className="mt-4" />

          <ul className="mt-5 max-h-96 divide-y divide-border/70 overflow-y-auto">
            {queue.items.map((item) => {
              const pct = item.size ? Math.round((item.uploaded / item.size) * 100) : 0;
              return (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel[item.status]} · {formatBytes(item.uploaded)} /{" "}
                      {formatBytes(item.size)}
                      {item.error ? ` · ${item.error}` : ""}
                    </p>
                    <Progress value={item.status === "done" ? 100 : pct} className="mt-2 h-1.5" />
                  </div>
                  {item.status === "failed" || item.status === "canceled" ? (
                    <Button size="icon" variant="ghost" onClick={() => queue.retry(item.id)}>
                      <RotateCcw className="size-4" />
                    </Button>
                  ) : item.status === "uploading" ? (
                    <Button size="icon" variant="ghost" onClick={() => void queue.cancel(item.id)}>
                      <X className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => queue.remove(item.id)}
                      disabled={queue.running}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
