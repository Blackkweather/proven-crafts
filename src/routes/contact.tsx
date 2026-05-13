// =============================================================================
// CONTACT PAGE — src/routes/contact.tsx
// =============================================================================
// Public contact form page. Anyone can reach out to the Skill Network team
// regarding hiring, press inquiries, partnerships, or anything else. The form
// is submitted to the database (for admin review) and an async notification
// email is fired in the background.
//
// The page has two states:
//   1. Form state — the user fills in name, email, company, topic, and message
//   2. Sent state — a confirmation is shown after a successful submission
//
// DATA FLOW:
//   - `submitContact(payload)` — saves the contact form submission to Supabase
//   - `notifyContactSubmission(payload)` — fires a notification (email/webhook)
//     as a fire-and-forget operation; failure is silently ignored
// KEYWORDS: DATABASE, STATE, VALIDATION
// =============================================================================

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { submitContact, notifyContactSubmission } from "@/lib/db";

// NAVIGATION: Route definition with SEO meta tags.
export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Skill Network" },
      {
        name: "description",
        content: "Talk to the Skill Network team about hiring, partnerships, or press.",
      },
      { property: "og:title", content: "Contact — Skill Network" },
      {
        property: "og:description",
        content: "Hiring, partnerships, press. We answer within one business day.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  // STATE: True after the form has been successfully submitted.
  const [sent, setSent] = useState(false);

  // STATE: True while the submitContact API call is in flight.
  const [loading, setLoading] = useState(false);

  // STATE: Error message shown if the submission fails.
  const [error, setError] = useState<string | null>(null);

  // STATE: All form field values grouped into a single object for convenience.
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",   // Optional field
    topic: "Hiring", // Default selection
    message: "",
  });

  // DATABASE: Submits the form to Supabase and fires a background notification.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        company: form.company || undefined, // Send as undefined if empty
        topic: form.topic,
        message: form.message,
      };
      // DATABASE: Persist the contact form submission.
      await submitContact(payload);
      // DATABASE: Fire the notification in the background.
      // .catch(() => {}) ensures a notification failure doesn't block the UX.
      notifyContactSubmission(payload).catch(() => {});
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <section className="container mx-auto grid gap-16 px-6 pb-24 pt-20 lg:grid-cols-12 lg:pt-28">
        {/* Left column: info + direct contact details */}
        <div className="lg:col-span-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Contact
          </div>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">Let's talk.</h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            We answer every message within one business day. No bots, no funnels — a real person on
            our team will read it.
          </p>

          {/* Direct contact email/address items */}
          <div className="mt-10 space-y-6">
            <ContactItem label="Hiring" detail="hire@skillnetwork.work" />
            <ContactItem label="Press" detail="press@skillnetwork.work" />
            <ContactItem label="Partnerships" detail="partners@skillnetwork.work" />
            <ContactItem label="Studio" detail="Berlin · Lisbon · Remote" />
          </div>
        </div>

        {/* Right column: the contact form (or success state) */}
        <div className="lg:col-span-7">
          <div className="surface-paper rounded-2xl p-8 md:p-10">
            {/* STATE: Success confirmation — shown after successful submission */}
            {sent ? (
              <div className="py-12 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="mt-5 font-display text-2xl">Message received.</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll be in touch at{" "}
                  <span className="text-foreground">{form.email || "your inbox"}</span> shortly.
                </p>
              </div>
            ) : (
              // Form state
              <form onSubmit={submit} className="space-y-5">
                {/* VALIDATION: Error banner — shown if the DB call fails */}
                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    {error}
                  </div>
                )}
                {/* Name + email side by side on wider screens */}
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* VALIDATION: Name is required */}
                  <Field label="Your name">
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                      placeholder="Jane Doe"
                    />
                  </Field>
                  {/* VALIDATION: Email is required and must be a valid email format */}
                  <Field label="Email">
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                      placeholder="jane@company.com"
                    />
                  </Field>
                </div>
                {/* Company name — optional */}
                <Field label="Company (optional)">
                  <input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                    placeholder="Where you work"
                  />
                </Field>
                {/* Topic dropdown — determines routing to the right team */}
                <Field label="Topic">
                  <select
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  >
                    <option>Hiring</option>
                    <option>Press</option>
                    <option>Partnerships</option>
                    <option>Something else</option>
                  </select>
                </Field>
                {/* VALIDATION: Message is required */}
                <Field label="Message">
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                    placeholder="Tell us what you're working on…"
                  />
                </Field>
                {/* STATE: Button is disabled while submitting */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
// Wraps a form control with a styled uppercase label.
// Used to ensure consistent label + input spacing throughout the form.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

// ─── ContactItem ──────────────────────────────────────────────────────────────
// Displays a contact type + detail pair (e.g. "Press · press@skillnetwork.work").
// Uses a left border accent to visually separate each item.
function ContactItem({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="border-l-2 border-border pl-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-lg">{detail}</div>
    </div>
  );
}
