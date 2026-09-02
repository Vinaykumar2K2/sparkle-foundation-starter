import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeading } from "@/components/AppShell";
import { Uploader } from "@/components/Uploader";
import { useAlbums } from "@/routes/_authenticated/photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queueFaceIndexing } from "@/lib/faceSearch.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/uploads")({
  head: () => ({
    meta: [
      { title: "Admin Uploads — Family Photo Hub" },
      { name: "description", content: "Bulk, resumable uploads for the main family library." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Uploads — Family Photo Hub" },
      {
        property: "og:description",
        content: "Bulk, resumable uploads for the main family library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUploads,
});

function AdminUploads() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const albums = useAlbums();
  const queryClient = useQueryClient();
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [newAlbum, setNewAlbum] = useState("");
  const [eventDate, setEventDate] = useState("");
  const indexFn = useServerFn(queueFaceIndexing);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [loading, isAdmin, navigate]);

  const createAlbum = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("albums")
        .insert({
          title: newAlbum.trim(),
          event_date: eventDate || null,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (id) => {
      setNewAlbum("");
      setEventDate("");
      setAlbumId(id);
      await queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success("Album created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create album"),
  });

  if (!isAdmin) return null;

  return (
    <>
      <PageHeading
        title="Admin Uploads"
        description="Add photos to the official library. Files upload in 6 MB chunks so large batches survive interruptions."
        action={
          <Button
            variant="outline"
            onClick={async () => {
              const res = await indexFn({});
              toast.message(
                res.configured
                  ? `${res.pending} photos queued for face indexing.`
                  : `${res.pending} photos are waiting — face matching provider is not configured yet.`,
              );
            }}
          >
            Queue face indexing
          </Button>
        }
      />

      <section className="mb-8 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Event / album</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setAlbumId(null)}
            className={cn(
              "rounded-full border border-border px-4 py-1.5 text-sm",
              albumId === null ? "bg-primary text-primary-foreground" : "hover:bg-accent/60",
            )}
          >
            Unsorted
          </button>
          {(albums.data ?? []).map((a) => (
            <button
              key={a.id}
              onClick={() => setAlbumId(a.id)}
              className={cn(
                "rounded-full border border-border px-4 py-1.5 text-sm",
                albumId === a.id ? "bg-primary text-primary-foreground" : "hover:bg-accent/60",
              )}
            >
              {a.title}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="album">New album</Label>
            <Input
              id="album"
              value={newAlbum}
              onChange={(e) => setNewAlbum(e.target.value)}
              placeholder="Diwali 2025"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Event date</Label>
            <Input
              id="date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            disabled={!newAlbum.trim() || createAlbum.isPending}
            onClick={() => createAlbum.mutate()}
          >
            Create album
          </Button>
        </div>
      </section>

      <Uploader library="main" albumId={albumId} allowFolders />
    </>
  );
}
