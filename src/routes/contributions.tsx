import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeading } from "@/components/AppShell";
import { PhotoGrid, type PhotoRecord } from "@/components/PhotoGrid";
import { Lightbox } from "@/components/Lightbox";
import { Uploader } from "@/components/Uploader";
import { downloadOriginal } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/contributions")({
  head: () => ({
    meta: [
      { title: "Family Contributions — Family Photo Hub" },
      { name: "description", content: "Favourite photos shared by every family member." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Family Contributions — Family Photo Hub" },
      { property: "og:description", content: "Favourite photos shared by every family member." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contributions,
});

type Group = { uploaderId: string; name: string; photos: PhotoRecord[] };

function Contributions() {
  const { user } = useAuth();
  const [open, setOpen] = useState<{ group: number; index: number } | null>(null);

  const query = useQuery({
    queryKey: ["contributions"],
    queryFn: async () => {
      const [{ data: photos, error }, { data: profiles }] = await Promise.all([
        supabase
          .from("photos")
          .select(
            "id, file_name, original_path, thumbnail_path, preview_path, width, height, size_bytes, caption, created_at, uploader_id",
          )
          .eq("library", "contribution")
          .eq("upload_status", "complete")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("profiles").select("id, display_name"),
      ]);
      if (error) throw error;
      const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
      const groups = new Map<string, Group>();
      for (const p of (photos ?? []) as PhotoRecord[]) {
        const key = p.uploader_id;
        if (!groups.has(key))
          groups.set(key, {
            uploaderId: key,
            name: names.get(key) ?? "Family member",
            photos: [],
          });
        groups.get(key)!.photos.push(p);
      }
      return [...groups.values()].sort((a, b) =>
        a.uploaderId === user?.id ? -1 : b.uploaderId === user?.id ? 1 : b.photos.length - a.photos.length,
      );
    },
  });

  const groups = useMemo(() => query.data ?? [], [query.data]);

  return (
    <>
      <PageHeading
        title="Family Contributions"
        description="A separate space for everyone's own favourites — kept apart from the official library."
      />

      <section className="mb-12">
        <h2 className="mb-3 font-display text-lg font-semibold">Share your photos</h2>
        <Uploader library="contribution" />
      </section>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No contributions yet — be the first to share one.
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map((g, gi) => (
            <section key={g.uploaderId}>
              <h2 className="mb-3 font-display text-lg font-semibold">
                {g.uploaderId === user?.id ? "Your photos" : g.name}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {g.photos.length} photo{g.photos.length > 1 ? "s" : ""}
                </span>
              </h2>
              <PhotoGrid
                photos={g.photos}
                onOpen={(p) => setOpen({ group: gi, index: g.photos.findIndex((x) => x.id === p.id) })}
                onDownload={(p) => void downloadOriginal(p.original_path, p.file_name)}
              />
            </section>
          ))}
        </div>
      )}

      {open ? (
        <Lightbox
          photos={groups[open.group]!.photos}
          index={open.index}
          onClose={() => setOpen(null)}
          onIndexChange={(i) => setOpen({ ...open, index: i })}
        />
      ) : null}
    </>
  );
}
