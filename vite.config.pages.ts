// Build config used ONLY for the GitHub Pages static deployment.
// It produces a fully static SPA (no server runtime) served from
// https://<user>.github.io/sparkle-foundation-starter/ with Supabase as the backend.
// The normal Lovable build keeps using vite.config.ts.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const base = process.env["PAGES_BASE"] ?? "/sparkle-foundation-starter/";

export default defineConfig({
  // No Cloudflare/Node server output — GitHub Pages only serves static files.
  nitro: false,
  tanstackStart: {
    spa: { enabled: true },
    prerender: { enabled: true },
    server: { entry: "server" },
  },
  vite: {
    base,
  },
});
