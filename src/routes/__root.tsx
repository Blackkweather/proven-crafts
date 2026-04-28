import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-display text-7xl text-foreground">404</div>
        <h2 className="mt-4 font-display text-2xl">Off the map</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That page doesn't exist — yet. Let's get you back to something useful.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Skill Network — Hire proven skills, not resumes" },
      {
        name: "description",
        content:
          "Skill Network is the editorial hiring platform for the people who actually do the work. Showcase real projects, take real challenges, get hired on signal.",
      },
      { property: "og:title", content: "Skill Network — Hire proven skills, not resumes" },
      {
        property: "og:description",
        content: "An editorial hiring platform built around proven skills, real work, and meaningful matches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Skill Network — Hire proven skills, not resumes" },
      { name: "description", content: "Skill Forge is a premium platform connecting talent and companies through proven skills and project-based evaluations." },
      { property: "og:description", content: "Skill Forge is a premium platform connecting talent and companies through proven skills and project-based evaluations." },
      { name: "twitter:description", content: "Skill Forge is a premium platform connecting talent and companies through proven skills and project-based evaluations." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c73c6bbc-7707-4282-9d69-804185a1934a/id-preview-7ddf422b--655c0f96-28fe-414d-8691-0a415fda0f7a.lovable.app-1777372800715.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c73c6bbc-7707-4282-9d69-804185a1934a/id-preview-7ddf422b--655c0f96-28fe-414d-8691-0a415fda0f7a.lovable.app-1777372800715.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
