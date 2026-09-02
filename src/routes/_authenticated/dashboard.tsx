import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Images, ScanFace, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeading } from "@/components/AppShell";
import { formatBytes } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Family Home — Family Photo Hub" },
      { name: "description", content: "Browse, contribute and find our family photos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Family Home — Family Photo Hub" },
      { property: "og:description", content: "Browse, contribute and find our family photos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [main, contrib, albums, sizes] = await Promise.all([
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("library", "main"),
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("library", "contribution"),
        supabase.from("albums").select("id", { count: "exact", head: true }),
        supabase.from("photos").select("size_bytes").limit(5000),
      ]);
      const bytes = (sizes.data ?? []).reduce((s, r) => s + Number(r.size_bytes ?? 0), 0);
      return {
        main: main.count ?? 0,
        contrib: contrib.count ?? 0,
        albums: albums.count ?? 0,
        bytes,
      };
    },
  });
}

const cards = [
  {
    to: "/photos",
    title: "Main Photos",
    body: "The official family library, organised by events and albums.",
    icon: Images,
    adminOnly: false,
  },
  {
    to: "/find-my-photos",
    title: "Find My Photos",
    body: "Upload a selfie and we'll look for photos you appear in.",
    icon: ScanFace,
    adminOnly: false,
  },
  {
    to: "/contributions",
    title: "Family Contributions",
    body: "Photos shared by everyone, grouped by who added them.",
    icon: Heart,
    adminOnly: false,
  },
  {
    to: "/uploads",
    title: "Admin Uploads",
    body: "Bulk-upload the main library with resumable transfers.",
    icon: UploadCloud,
    adminOnly: true,
  },
] as const;

function Dashboard() {
  const { isAdmin, displayName } = useAuth();
  const { data } = useStats();

  return (
    <>
      <PageHeading
        title={`Welcome${displayName ? `, ${displayName}` : ""}`}
        description="Every photo we've kept, in one warm and private place for the family."
      />

      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Main photos", value: data?.main ?? "—" },
          { label: "Contributions", value: data?.contrib ?? "—" },
          { label: "Albums", value: data?.albums ?? "—" },
          { label: "Stored", value: data ? formatBytes(data.bytes) : "—" },
        ].map((s) => (
          <Card key={s.label} className="border-border/70 shadow-soft">
            <CardContent className="p-5">
              <p className="font-display text-2xl font-semibold">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards
          .filter((c) => !c.adminOnly || isAdmin)
          .map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-2xl border border-border/70 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <c.icon className="size-5" />
              </span>
              <h2 className="font-display text-xl font-semibold">{c.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
            </Link>
          ))}
      </div>
    </>
  );
}
