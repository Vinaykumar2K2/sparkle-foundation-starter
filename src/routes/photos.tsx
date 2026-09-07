import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeading } from "@/components/AppShell";
import { PhotoGrid, type PhotoRecord } from "@/components/PhotoGrid";
import { Lightbox } from "@/components/Lightbox";
import { Button } from "@/components/ui/button";
import { downloadMany, downloadOriginal } from "@/lib/storage";
import { deletePhoto } from "@/lib/photoAdmin";
import { useAlbums } from "@/lib/albums";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 48;

export const Route = createFileRoute("/photos")({
  head: () => ({
    meta: [
      { title: "Main Photos — Family Photo Hub" },
      { name: "description", content: "The official family photo library, by event and album." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Main Photos — Family Photo Hub" },
      {
        property: "og:description",
        content: "The official family photo library, by event and album.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MainPhotos,
});

function MainPhotos() {
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const albums = useAlbums();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["main-photos", albumId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from("photos")
        .select(
          "id, file_name, original_path, thumbnail_path, preview_path, width, height, size_bytes, caption, created_at, uploader_id, contributor_name",
        )
        .eq("library", "main")
        .eq("upload_status", "complete")
        .order("created_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, pageParam * PAGE_SIZE + PAGE_SIZE - 1);
      if (albumId) q = q.eq("album_id", albumId);
      const { data, error } = await q;
      if (error) throw error;
      return data as PhotoRecord[];
    },
    getNextPageParam: (last, pages) => (last.length === PAGE_SIZE ? pages.length : undefined),
  });

  const photos = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const selectedPhotos = photos.filter((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove(photo: PhotoRecord) {
    if (!window.confirm(`Delete “${photo.file_name}” permanently?`)) return;
    try {
      await deletePhoto(photo);
      await queryClient.invalidateQueries({ queryKey: ["main-photos"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Photo deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete photo");
    }
  }

  return (
    <AppShell>
      <PageHeading
        title="Main Photos"
        description="Our official family library. Downloads always give you the untouched original file."
        action={
          selectedPhotos.length ? (
            <Button
              onClick={() =>
                void downloadMany(
                  selectedPhotos.map((p) => ({ path: p.original_path, fileName: p.file_name })),
                )
              }
            >
              <Download className="mr-2 size-4" /> Download {selectedPhotos.length} original
              {selectedPhotos.length > 1 ? "s" : ""}
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setAlbumId(null)}
          className={cn(
            "rounded-full border border-border px-4 py-1.5 text-sm transition-colors",
            albumId === null ? "bg-primary text-primary-foreground" : "hover:bg-accent/60",
          )}
        >
          All photos
        </button>
        {(albums.data ?? []).map((a) => (
          <button
            key={a.id}
            onClick={() => setAlbumId(a.id)}
            className={cn(
              "rounded-full border border-border px-4 py-1.5 text-sm transition-colors",
              albumId === a.id ? "bg-primary text-primary-foreground" : "hover:bg-accent/60",
            )}
          >
            {a.title}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No photos in the main library yet.
        </p>
      ) : (
        <PhotoGrid
          photos={photos}
          selected={selected}
          onToggleSelect={toggle}
          onOpen={(p) => setOpenIndex(photos.findIndex((x) => x.id === p.id))}
          onDownload={(p) => void downloadOriginal(p.original_path, p.file_name)}
          {...(isAdmin ? { onDelete: (p: PhotoRecord) => void remove(p) } : {})}
        />
      )}

      {query.hasNextPage ? (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      ) : null}

      {openIndex !== null ? (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </AppShell>
  );
}
