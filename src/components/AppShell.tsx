import { Link, useNavigate } from "@tanstack/react-router";
import { Images, Home, UploadCloud, Heart, ScanFace, LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Home", icon: Home, adminOnly: false },
  { to: "/photos", label: "Main Photos", icon: Images, adminOnly: false },
  { to: "/find-my-photos", label: "Find My Photos", icon: ScanFace, adminOnly: false },
  { to: "/contributions", label: "Contributions", icon: Heart, adminOnly: false },
  { to: "/uploads", label: "Admin Uploads", icon: UploadCloud, adminOnly: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { isAdmin, displayName, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const visible = links.filter((l) => !l.adminOnly || isAdmin);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
          <Link to="/dashboard" className="font-display text-lg font-semibold tracking-tight">
            Family Photo Hub
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {visible.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {displayName || "Family"}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              <Menu className="size-4" />
            </Button>
          </div>
        </div>
        <div className={cn("border-t border-border/70 md:hidden", open ? "block" : "hidden")}>
          <nav className="mx-auto flex max-w-6xl flex-col p-2">
            {visible.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                <l.icon className="size-4" />
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 md:py-12">{children}</main>
    </div>
  );
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="max-w-xl text-sm text-muted-foreground md:text-base">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
