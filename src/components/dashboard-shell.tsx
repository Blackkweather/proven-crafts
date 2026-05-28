// =============================================================================
// DASHBOARD — src/components/dashboard-shell.tsx
// =============================================================================
// The main layout wrapper for every authenticated dashboard page.
// Used by the talent dashboard (/app), company dashboard (/company),
// and admin panel (/admin).
//
// LAYOUT (desktop):
//   ┌──────────────────┬───────────────────────────────┐
//   │  Sidebar 260px   │  Top Header                   │
//   │  ─────────────── │  ─────────────────────────── │
//   │  Logo + badge    │  Page title + actions         │
//   │  ← Back to Home  ├───────────────────────────── │
//   │  Nav links       │  Page content (children)      │
//   │  ─────────────── │                               │
//   │  Avatar + logout │                               │
//   └──────────────────┴───────────────────────────────┘
//
// LAYOUT (mobile): sidebar hidden, hamburger opens a slide-in Sheet drawer.
//
// KEYWORDS: DASHBOARD, NAVIGATION, STATE, AUTH
// =============================================================================

import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { type ReactNode, useState, Component, type ErrorInfo } from "react";
import { useAuth } from "@/lib/auth";
import { useUnreadCounts } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

class PageErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PageErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="font-display text-2xl text-foreground">Something went wrong</div>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            An unexpected error occurred on this page. Try refreshing, or contact support if the problem persists.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-6 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// -----------------------------------------------------------------------------
// TYPE — NavItem
// Describes one link in the sidebar navigation list.
// badgeKey links to live unread counts (messages or notifications).
// -----------------------------------------------------------------------------
interface NavItem {
  to: string;       // TanStack Router path (e.g. "/app/inbox")
  label: string;    // Text shown in the sidebar
  icon: ReactNode;  // 16×16 SVG icon element
  badgeKey?: "messages" | "notifications"; // Optional badge from live counts
}

// =============================================================================
// NAVIGATION — NavLink
// =============================================================================
// A single sidebar navigation link. Auto-highlights when the current URL
// matches. Shows a badge count if there are unread items.
// =============================================================================
function NavLink({
  item,
  counts,
  onClick,
}: {
  item: NavItem;
  counts: { messages: number; notifications: number };
  onClick?: () => void;
}) {
  const location = useLocation();

  // NAVIGATION: Active when path exactly matches or starts with item.to + "/"
  // so sub-pages (e.g. /app/profile/edit) keep the parent link highlighted.
  const active =
    location.pathname === item.to ||
    location.pathname.startsWith(item.to + "/");

  const unread = item.badgeKey ? counts[item.badgeKey] : 0;

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {/* Icon — badge dot sits over the top-right corner */}
      <span className="relative shrink-0 opacity-80 transition-opacity group-hover:opacity-100">
        {item.icon}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        )}
      </span>

      <span className="flex-1 truncate">{item.label}</span>

      {/* Unread count pill on the right */}
      {unread > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

// =============================================================================
// SIDEBAR CONTENT
// =============================================================================
// Rendered inside both the desktop aside and the mobile Sheet so the layout
// is identical in both contexts. onNavClick closes the mobile Sheet on tap.
//
// KEYWORDS: NAVIGATION, AUTH, DASHBOARD
// =============================================================================
function SidebarContent({
  nav,
  badge,
  displayName,
  email,
  counts,
  onNavClick,
  onSignOut,
}: {
  nav: NavItem[];
  badge: string;
  displayName: string;
  email: string;
  counts: { messages: number; notifications: number };
  onNavClick?: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col">

      {/* ── Header: Logo + role badge ── */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-4">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-foreground text-background shadow-sm">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="3" cy="3" r="2" fill="currentColor" />
            <circle cx="11" cy="3" r="2" fill="currentColor" />
            <circle cx="7" cy="11" r="2" fill="currentColor" />
            <path d="M3 3 L7 11 L11 3" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
          </svg>
        </span>
        <span className="font-display text-base leading-none">Skill Network</span>
        <span className="ml-auto shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          {badge}
        </span>
      </div>

      {/* ── Back to Home ── */}
      {/* NAVIGATION: Lets signed-in users return to the public landing page.
          This is the key missing link — clicking exits the dashboard entirely. */}
      <div className="border-b border-border/40 px-3 py-2">
        <Link
          to="/"
          onClick={onNavClick}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* ── Navigation Links ── */}
      {/* NAVIGATION: Each NavItem comes from the parent route (app.tsx / company.tsx).
          NavLink handles active highlighting and unread badges automatically. */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Dashboard navigation">
        {nav.map((item) => (
          <NavLink key={item.to} item={item} counts={counts} onClick={onNavClick} />
        ))}
      </nav>

      {/* ── User Footer ── */}
      {/* AUTH: Shows who is logged in. Avatar letter = first char of display name.
          Sign-out calls signOut() from AuthContext then redirects to "/". */}
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
          {/* Avatar circle with gradient background */}
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground shadow-sm">
            {displayName.slice(0, 1).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-none">{displayName}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{email}</div>
          </div>

          {/* AUTH: Sign-out button */}
          <button
            onClick={onSignOut}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DASHBOARD SHELL — Main Export
// =============================================================================
// The root layout for all authenticated pages. Composes:
//   - Desktop sidebar (always visible at lg+)
//   - Mobile Sheet drawer (toggled by hamburger button)
//   - Sticky top header with page title + optional action buttons
//   - Animated main content area where child routes render
//
// KEYWORDS: DASHBOARD, NAVIGATION, AUTH, STATE
// =============================================================================
export function DashboardShell({
  title,
  subtitle,
  nav,
  badge,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  badge: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  // AUTH: Reads current user, profile, and signOut from the AuthContext
  const { user, profile, signOut } = useAuth();

  // Derive the user's display name with graceful fallbacks
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Guest";

  const router = useRouter();

  // STATE: Whether the mobile sidebar drawer is open
  const [mobileOpen, setMobileOpen] = useState(false);

  // STATE: Live unread badge counts (refreshed via Supabase Realtime subscription)
  // DATABASE: useUnreadCounts queries the conversations + notifications tables
  const counts = useUnreadCounts(user?.id);

  // AUTH: Signs the user out via Supabase, then sends them to the landing page
  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/" });
  }

  const sidebarProps = {
    nav,
    badge,
    displayName,
    email: user?.email ?? "",
    counts,
    onSignOut: handleSignOut,
  };

  return (
    // DASHBOARD: Two-column grid on desktop. Single column (full-width) on mobile.
    <div className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[260px_1fr]">

      {/* ── Desktop Sidebar ── */}
      {/* Sticky so it stays in place while the main content scrolls */}
      <aside className="hidden border-r border-border/60 bg-paper/80 lg:block">
        <div className="sticky top-0 h-dvh overflow-hidden">
          <SidebarContent {...sidebarProps} />
        </div>
      </aside>

      {/* ── Mobile Sidebar (Sheet) ── */}
      {/* NAVIGATION: Slides in from left on mobile. Closes when a link is tapped. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[270px] p-0 bg-paper">
          <SidebarContent {...sidebarProps} onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ── Main Content Column ── */}
      <div className="flex min-w-0 flex-col">

        {/* ── Top Header ── */}
        {/* Sticky with backdrop blur so content scrolls underneath it cleanly */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm lg:px-8">

          {/* NAVIGATION: Hamburger — only visible on mobile (hidden at lg breakpoint) */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Open navigation menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Page title and subtitle passed in from the parent route */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl leading-none tracking-tight lg:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {/* Optional action buttons (e.g. "Post a job", "Export CSV") */}
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>

        {/* ── Page Content ── */}
        {/* DASHBOARD: Child route components render here via <Outlet />.
            animate-fade-up gives a smooth entrance on every route transition. */}
        <main className="flex-1 animate-fade-up px-4 py-6 lg:px-8 lg:py-8">
          <PageErrorBoundary>{children}</PageErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// ICONS — Shared SVG icon set for sidebar navigation
// =============================================================================
// All icons are 16×16 stroke-based inline SVGs so no icon library is needed.
// Import `Icons` in any dashboard route to access them.
// KEYWORD: DASHBOARD
// =============================================================================
export const Icons = {
  home: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" />
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
  briefcase: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  bolt: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  inbox: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13l3.5 7v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7l3.5-7z" />
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.5" /><path d="M2 21c1-4 4-5.5 7-5.5s6 1.5 7 5.5" />
      <circle cx="17" cy="9" r="2.5" /><path d="M16 15c2.5 0 5 1.2 6 4" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.5 8 9 4.6-.5 8-4.5 8-9V6l-8-3z" />
    </svg>
  ),
  building: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2" />
    </svg>
  ),
  clipboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  ),
  gear: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
  flag: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 7L2 7" />
    </svg>
  ),
  card: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  handshake: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 12l2 2 4-4" />
      <path d="M3 12c0-1.5.5-3 2-4l3-2h8l3 2c1.5 1 2 2.5 2 4s-.5 3-2 4l-3 2H8l-3-2c-1.5-1-2-2.5-2-4z" />
    </svg>
  ),
};
