import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Starter — Your App" },
      { name: "description", content: "A clean starter foundation built with Lovable." },
      { property: "og:title", content: "Starter — Your App" },
      { property: "og:description", content: "A clean starter foundation built with Lovable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Your app starts here
        </h1>
        <p className="text-base text-muted-foreground">
          A clean Lovable starter foundation. Ready for your next idea.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}

