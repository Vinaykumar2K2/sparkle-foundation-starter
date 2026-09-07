import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeading } from "@/components/AppShell";
import { PhotoGrid, type PhotoRecord } from "@/components/PhotoGrid";
import { Lightbox } from "@/components/Lightbox";
import { Uploader } from "@/components/Uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadOriginal } from "@/lib/storage";
import { deletePhoto } from "@/lib/photoAdmin";
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

type Group = { key: string; name: string; photos: PhotoRecord[] };

const NAME_KEY = "family-hub-contributor-name";

function Contributions() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<{ group: number; index: number } | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(window.localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  useEffect(() => {
    if (name.trim()) window.localStorage.setItem(NAME_KEY, name.trim());
  }, [name]);

  const query = useQuery({
    queryKey: ["contributions"],
    queryFn: async () => {
      const [{ data: photos, error }, { data: profiles }] = await Promise.all([
        supabase
          .from("photos")
          .select(
            "id, file_name, original_path, thumbnail_path, preview_path, width, height, size_bytes, caption, created_at, uploader_id, contributor_name",
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
        const label =
          p.contributor_name?.trim() ||
          (p.uploader_id ? (names.get(p.uploader_id) ?? "Family member") : "Family member");
        const key = label.toLowerCase();
        if (!groups.has(key)) groups.set(key, { key, name: label, photos: [] });
        groups.get(key)!.photos.push(p);
      }
      return [...groups.values()].sort((a, b) => b.photos.length - a.photos.length);
    },
  });

  const groups = useMemo(() => query.data ?? [], [query.data]);
  const canUpload = name.trim().length >= 2;

  async function remove(photo: PhotoRecord) {
    if (!window.confirm(`Delete “${photo.file_name}” permanently?`)) return;
    try {
      await deletePhoto(photo);
      await queryClient.invalidateQueries({ queryKey: ["contributions"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Photo deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete photo");
    }
  }

  return (
    <AppShell>
      <PageHeading
        title="Family Contributions"
        description="A separate space for everyone's own favourites — kept apart from the official library."
      />

      <section className="mb-12">
        <h2 className="mb-3 font-display text-lg font-semibold">Share your photos</h2>
        <div className="mb-4 max-w-sm space-y-2">
          <Label htmlFor="contributor">Your name</Label>
          <Input
            id="contributor"
            value={name}
            maxLength={60}
            placeholder="e.g. Anita"
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            We show this above your photos so everyone knows who shared them.
          </p>
        </div>
        <Uploader
          library="contribution"
          contributorName={name}
          disabled={!canUpload}
          disabledHint="Add your name above to start sharing photos."
        />
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
            <section key={g.key}>
              <h2 className="mb-3 font-display text-lg font-semibold">
                {g.name}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {g.photos.length} photo{g.photos.length > 1 ? "s" : ""}
                </span>
              </h2>
              <PhotoGrid
                photos={g.photos}
                onOpen={(p) =>
                  setOpen({ group: gi, index: g.photos.findIndex((x) => x.id === p.id) })
                }
                onDownload={(p) => void downloadOriginal(p.original_path, p.file_name)}
                {...(isAdmin ? { onDelete: (p: PhotoRecord) => void remove(p) } : {})}
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
    </AppShell>
  );
}
