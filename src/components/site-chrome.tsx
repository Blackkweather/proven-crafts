// =============================================================================
// SITE CHROME — src/components/site-chrome.tsx
// =============================================================================
// Public-facing header and footer used on all marketing / unauthenticated pages
// (landing, talent directory, companies, pricing, manifesto, etc.).
//
// Components exported:
//   - SiteHeader  — sticky top navbar with logo, nav links, auth CTAs
//   - SiteFooter  — full-width footer with link columns
//
// The header is responsive:
//   - Desktop: horizontal nav links are visible
//   - Mobile:  nav links collapse into a hamburger-triggered Sheet drawer
//
// KEYWORDS: NAVIGATION, AUTH
// =============================================================================

import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// =============================================================================
// SITE HEADER
// =============================================================================
// Sticky top navigation bar shown on all public pages.
//
// AUTH: Conditionally renders either:
//   - "Dashboard" + "Sign out" links when the user is logged in
//   - "Log in" + "Join" CTA buttons when the user is a guest
//
// NAVIGATION: Links cover the main marketing sections of the app.
// =============================================================================
export function SiteHeader() {
  // AUTH: Pull user, their primary role, and signOut from AuthContext
  const { user, primaryRole, signOut } = useAuth();
  const router = useRouter();

  // STATE: Controls mobile menu open/close
  const [mobileOpen, setMobileOpen] = useState(false);

  // AUTH: Signs out then redirects to the landing page
  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/" });
  }

  // NAVIGATION: The main nav links shown in both desktop and mobile menus
  const navLinks = [
    { to: "/talent", label: "For talent" },
    { to: "/companies", label: "For companies" },
    { to: "/challenges", label: "Challenges" },
    { to: "/leaderboard", label: "Leaderboard" },
    { to: "/pricing", label: "Pricing" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-6">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <Logo />
          <span className="font-display text-lg tracking-tight">Skill Network</span>
        </Link>

        {/* ── Desktop Navigation ── */}
        {/* Hidden on mobile screens (hidden md:flex) */}
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Right Side: Auth CTAs + Mobile Hamburger ── */}
        <div className="flex items-center gap-2">

          {/* AUTH: Show dashboard/sign-out when logged in, login/join when not */}
          {user ? (
            <>
              {/* NAVIGATION: Links to the user's dashboard based on their role */}
              <Link
                to={dashboardPathFor(primaryRole)}
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:block"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:block"
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

          {/* ── Mobile Hamburger ── */}
          {/* NAVIGATION: Only visible on small screens (md:hidden).
              Opens the mobile nav Sheet. */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Sheet ── */}
      {/* NAVIGATION: Full-screen slide-in drawer for mobile nav.
          Shows all nav links + auth buttons in a vertical list. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <div className="flex h-full flex-col">

            {/* Mobile menu header with logo */}
            <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
              <Logo />
              <span className="font-display text-base">Skill Network</span>
            </div>

            {/* Mobile nav links */}
            <nav className="flex-1 space-y-1 p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  activeProps={{ className: "bg-accent text-foreground" }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile auth buttons */}
            <div className="border-t border-border p-4 space-y-2">
              {user ? (
                <>
                  <Link
                    to={dashboardPathFor(primaryRole)}
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { setMobileOpen(false); handleSignOut(); }}
                    className="block w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
                  >
                    Join free
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

// =============================================================================
// LOGO — Reusable brand mark
// =============================================================================
// Three dots forming a triangle — the Skill Network icon.
// Used in both the header and the auth layout left panel.
// =============================================================================
function Logo() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground text-background shadow-sm">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <circle cx="3" cy="3" r="2" fill="currentColor" />
        <circle cx="11" cy="3" r="2" fill="currentColor" />
        <circle cx="7" cy="11" r="2" fill="currentColor" />
        <path d="M3 3 L7 11 L11 3" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
      </svg>
    </span>
  );
}

// =============================================================================
// SITE FOOTER
// =============================================================================
// Full-width footer with the brand tagline and two link columns.
// Shown at the bottom of every marketing page.
// KEYWORD: NAVIGATION
// =============================================================================
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container mx-auto grid gap-10 px-6 py-14 md:grid-cols-4">

        {/* Brand column */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Logo />
            <div className="font-display text-xl">Skill Network</div>
          </div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
            A hiring platform built around proven skills, not paper credentials.
            Made for the people who actually do the work.
          </p>
        </div>

        {/* Product links */}
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

        {/* Company links */}
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

      {/* Bottom bar: copyright + version */}
      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-start justify-between gap-2 px-6 py-5 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Skill Network. Crafted in calm focus.</span>
          <span className="font-mono uppercase tracking-widest">v0.1 · preview</span>
        </div>
      </div>
    </footer>
  );
}

// Helper type and component for footer link columns
type FooterLink = { label: string; to: string };

function FooterCol({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div>
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-2.5 text-sm">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              to={item.to}
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
