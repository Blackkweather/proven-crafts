import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useUnreadCounts } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badgeKey?: "messages" | "notifications";
}

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
  const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
  const unread = item.badgeKey ? counts[item.badgeKey] : 0;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span className="relative opacity-80">
        {item.icon}
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      <span className="flex-1">{item.label}</span>
      {unread > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

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
    <>
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="3" cy="3" r="2" fill="currentColor" />
            <circle cx="11" cy="3" r="2" fill="currentColor" />
            <circle cx="7" cy="11" r="2" fill="currentColor" />
          </svg>
        </span>
        <span className="font-display text-base">Skill Network</span>
        <span className="ml-auto rounded-full border border-border bg-background px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          {badge}
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((n) => (
          <NavLink key={n.to} item={n} counts={counts} onClick={onNavClick} />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{email}</div>
          </div>
          <button
            onClick={onSignOut}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

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
  const { user, profile, signOut } = useAuth();
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Guest";
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const counts = useUnreadCounts(user?.id);

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
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[260px_1fr] bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border bg-paper lg:flex lg:flex-col">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0 bg-paper flex flex-col">
          <SidebarContent {...sidebarProps} onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-10">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl leading-none lg:text-2xl">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-10 lg:py-10 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}

export const Icons = {
  home: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M3 12 12 3l9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  user: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
  briefcase: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  bolt: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  inbox: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13l3.5 7v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7l3.5-7z" />
    </svg>
  ),
  bell: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  users: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c1-4 4-5.5 7-5.5s6 1.5 7 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 15c2.5 0 5 1.2 6 4" />
    </svg>
  ),
  shield: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M12 3 4 6v6c0 4.5 3.4 8.5 8 9 4.6-.5 8-4.5 8-9V6l-8-3z" />
    </svg>
  ),
  building: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2" />
    </svg>
  ),
  clipboard: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  ),
  gear: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  search: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  chart: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
};
