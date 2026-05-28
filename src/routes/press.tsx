// =============================================================================
// PRESS PAGE — src/routes/press.tsx
// =============================================================================
// Static press page containing founder quotes, a press kit request link, and
// a list of recent media coverage. No data fetching occurs — all content is
// hardcoded in the `coverage` array. Sets Open Graph and meta tags for SEO.
//
// The coverage list links to the contact page (actual article URLs not yet
// integrated). The press kit is available on request via the contact form.
//
// KEYWORDS: NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

// NAVIGATION: Route definition with SEO meta tags.
export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: "Press — Skill Network" },
      {
        name: "description",
        content: "Press kit, founder quotes, and recent coverage of Skill Network.",
      },
      { property: "og:title", content: "Press — Skill Network" },
      { property: "og:description", content: "Founder quotes, brand assets, and coverage." },
    ],
  }),
  component: PressPage,
});


function PressPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Page headline */}
      <section className="container mx-auto px-6 pb-16 pt-20 lg:pt-28">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Press
        </div>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">
          A different shape for hiring,
          <br />
          <span className="italic text-muted-foreground">in the words of others.</span>
        </h1>
      </section>

      {/* Press kit + founder quotes section */}
      <section className="border-y border-border bg-paper">
        <div className="container mx-auto grid gap-12 px-6 py-20 lg:grid-cols-12">
          {/* Left: press kit download CTA */}
          <div className="lg:col-span-4">
            <h2 className="font-display text-3xl">Press kit</h2>
            <p className="mt-3 text-muted-foreground">
              Logos, founder portraits, product screenshots, and the one-pager. Updated quarterly.
            </p>
            {/* NAVIGATION: Links to the contact page to request the press kit */}
            <Link
              to="/contact"
              className="mt-6 inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              Request press kit →
            </Link>
          </div>
          {/* Right: placeholder for founder quotes — add real quotes here */}
          <div className="grid gap-6 lg:col-span-8 md:grid-cols-2">
            <div className="surface-paper rounded-2xl p-6 text-sm text-muted-foreground">
              Founder quotes coming soon.
            </div>
          </div>
        </div>
      </section>

      {/* Recent media coverage list */}
      <section className="container mx-auto px-6 py-24">
        <h2 className="font-display text-3xl">Recent coverage</h2>
        <div className="mt-8 rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          No press coverage listed yet. For media enquiries, use the contact form below.
        </div>
        <div className="mt-6 text-center">
          <Link
            to="/contact"
            className="inline-flex rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Contact us →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

