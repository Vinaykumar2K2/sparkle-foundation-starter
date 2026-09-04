import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Family Photo Hub — Our private family album" },
      {
        name: "description",
        content: "A private, family-only home for our photos, albums and memories.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Family Photo Hub — Our private family album" },
      {
        property: "og:description",
        content: "A private, family-only home for our photos, albums and memories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="max-w-lg space-y-6">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Private · Family only</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground">
          Family Photo Hub
        </h1>
        <p className="text-base text-muted-foreground">
          Every album, every celebration, every quiet moment — kept safely together for our
          family, at full original quality.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in to the hub
        </Link>
      </div>
    </main>
  );
}

