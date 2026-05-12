import { Link, useRouter } from "@tanstack/react-router";
import { useAuth, dashboardPathFor } from "@/lib/auth";

export function SiteHeader() {
  const { user, primaryRole, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg tracking-tight">Skill Network</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link
            to="/talent"
            className="transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            For talent
          </Link>
          <Link
            to="/companies"
            className="transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            For companies
          </Link>
          <Link
            to="/leaderboard"
            className="transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Leaderboard
          </Link>
          <Link
            to="/manifesto"
            className="transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Manifesto
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to={dashboardPathFor(primaryRole)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Dashboard
              </Link>
              <button
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/" });
                }}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="3" cy="3" r="2" fill="currentColor" />
        <circle cx="11" cy="3" r="2" fill="currentColor" />
        <circle cx="7" cy="11" r="2" fill="currentColor" />
        <path d="M3 3 L7 11 L11 3" stroke="currentColor" strokeWidth="0.8" />
      </svg>
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto grid gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-display text-2xl">Skill Network</div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            A hiring platform built around proven skills, not paper credentials. Made for the people
            who actually do the work.
          </p>
        </div>
        <FooterCol
          title="Product"
          items={[
            { label: "For talent", to: "/talent" },
            { label: "For companies", to: "/companies" },
            { label: "Challenges", to: "/challenges" },
            { label: "Leaderboard", to: "/leaderboard" },
            { label: "Pricing", to: "/pricing" },
          ]}
        />
        <FooterCol
          title="Company"
          items={[
            { label: "Manifesto", to: "/manifesto" },
            { label: "Press", to: "/press" },
            { label: "Careers", to: "/careers" },
            { label: "Contact", to: "/contact" },
          ]}
        />
      </div>
      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-start justify-between gap-2 px-6 py-5 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Skill Network. Crafted in calm focus.</span>
          <span className="font-mono uppercase tracking-widest">v0.1 · preview</span>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = { label: string; to: string };

function FooterCol({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div>
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.label}>
            <Link to={i.to} className="text-foreground/80 transition-colors hover:text-foreground">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
