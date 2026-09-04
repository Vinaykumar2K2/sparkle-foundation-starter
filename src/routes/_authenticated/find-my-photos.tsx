import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, ScanFace } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeading } from "@/components/AppShell";
import { PhotoGrid, type PhotoRecord } from "@/components/PhotoGrid";
import { Lightbox } from "@/components/Lightbox";
import { Button } from "@/components/ui/button";
import { SELFIES_BUCKET, downloadOriginal } from "@/lib/storage";
import { getFaceProviderStatus, runSelfieSearch } from "@/lib/faceSearch.functions";

export const Route = createFileRoute("/_authenticated/find-my-photos")({
  head: () => ({
    meta: [
      { title: "Find My Photos — Family Photo Hub" },
      { name: "description", content: "Upload a selfie to find family photos you appear in." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Find My Photos — Family Photo Hub" },
      {
        property: "og:description",
        content: "Upload a selfie to find family photos you appear in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FindMyPhotos;
});

type Match = { photo: PhotoRecord; similarity: number };

function FindMyPhotos() {
  const { user } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const search = useServerFn(runSelfieSearch);
  const statusFn = useServerFn(getFaceProviderStatus);

  const status = useQuery({
    queryKey: ["face-provider-status"],
    queryFn: () => statusFn({}),
  });

  async function onSelfie(file: File) {
    if (!user) return;
    setBusy(true);
    setNotice(null);
    setMatches([]);
    try {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from(SELFIES_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (error) throw error;

      const result = await search({ data: { selfiePath: path } });
      if (!result.configured) {
        setNotice(
          "Face matching isn't switched on yet. Your selfie was stored privately and will be removed automatically — it never enters the gallery.",
        );
        return;
      }
      if (!result.matches.length) {
        setNotice("No likely matches were returned for this selfie.");
        return;
      }
      const ids = (result.matches as { photoId: string; similarity: number }[]).map(
        (m) => m.photoId,
      );
      const { data: photos } = await supabase
        .from("photos")
        .select(
          "id, file_name, original_path, thumbnail_path, preview_path, width, height, size_bytes, caption, created_at, uploader_id",
        )
        .in("id", ids);
      const byId = new Map((photos ?? []).map((p) => [p.id, p as PhotoRecord]));
      setMatches(
        (result.matches as { photoId: string; similarity: number }[])
          .map((m) => ({ photo: byId.get(m.photoId), similarity: m.similarity }))
          .filter((m): m is Match => Boolean(m.photo)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Selfie search failed");
    } finally {
      setBusy(false);
    }
  }

  const photos = matches.map((m) => m.photo);

  return (
    <>
      <PageHeading
        title="Find My Photos"
        description="Upload one clear selfie and we'll look through the main library for photos you're likely in."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center shadow-soft">
          <ScanFace className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-display text-lg font-semibold">Upload a selfie</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            A face-forward photo works best. Results are likely matches, not certainties — always
            check before downloading.
          </p>
          <Button className="mt-5" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {busy ? "Searching…" : "Choose selfie"}
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onSelfie(f);
            }}
          />
        </div>

        <aside className="rounded-2xl border border-border/70 bg-accent/40 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Lock className="size-4" /> Your privacy
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Your selfie is stored in a private bucket only you can read.</li>
            <li>It is never added to the gallery or shown to other family members.</li>
            <li>Searches and their selfies expire automatically after 24 hours.</li>
            <li>
              Matching status:{" "}
              {status.data?.configured
                ? `enabled (${status.data.provider})`
                : "not configured yet — no results will be invented."}
            </li>
          </ul>
        </aside>
      </div>

      {notice ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}

      {matches.length ? (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold">
            Likely matches
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {matches.length} photo{matches.length > 1 ? "s" : ""} · sorted by confidence
            </span>
          </h2>
          <PhotoGrid
            photos={photos}
            onOpen={(p) => setOpenIndex(photos.findIndex((x) => x.id === p.id))}
            onDownload={(p) => void downloadOriginal(p.original_path, p.file_name)}
          />
        </section>
      ) : null}

      {openIndex !== null ? (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </>
  );
}
