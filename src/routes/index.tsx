import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
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
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/auth" });
  },
  component: () => null,
});
