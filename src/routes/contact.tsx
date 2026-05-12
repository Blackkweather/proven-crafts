import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { submitContact, notifyContactSubmission } from "@/lib/db";

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
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    topic: "Hiring",
    message: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        company: form.company || undefined,
        topic: form.topic,
        message: form.message,
      };
      await submitContact(payload);
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
        <div className="lg:col-span-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Contact
          </div>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">Let's talk.</h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            We answer every message within one business day. No bots, no funnels — a real person on
            our team will read it.
          </p>

          <div className="mt-10 space-y-6">
            <ContactItem label="Hiring" detail="hire@skillnetwork.work" />
            <ContactItem label="Press" detail="press@skillnetwork.work" />
            <ContactItem label="Partnerships" detail="partners@skillnetwork.work" />
            <ContactItem label="Studio" detail="Berlin · Lisbon · Remote" />
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="surface-paper rounded-2xl p-8 md:p-10">
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
              <form onSubmit={submit} className="space-y-5">
                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    {error}
                  </div>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Your name">
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                      placeholder="Jane Doe"
                    />
                  </Field>
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
                <Field label="Company (optional)">
                  <input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                    placeholder="Where you work"
                  />
                </Field>
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
