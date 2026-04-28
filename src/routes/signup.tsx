import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, dashboardPathFor, type Role } from "@/lib/auth";
import { AuthLayout, Field, RolePicker } from "./login";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("talent");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    signUp(name, email, password, role);
    router.navigate({ to: dashboardPathFor(role) });
  }

  return (
    <AuthLayout
      eyebrow="Join the network"
      title="Show what you can do."
      sub="Take 3 minutes. Skip the resume."
      footer={<>Already a member? <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5">
        <RolePicker value={role} onChange={setRole} />
        <Field label="Name">
          <input
            value={name} onChange={(e) => setName(e.target.value)} required
            placeholder={role === "company" ? "Company name" : "Your name"}
            className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </Field>
        <Field label="Email">
          <input
            value={email} onChange={(e) => setEmail(e.target.value)} required type="email"
            placeholder="you@work.com"
            className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </Field>
        <Field label="Password">
          <input
            value={password} onChange={(e) => setPassword(e.target.value)} required type="password" minLength={8}
            placeholder="At least 8 characters"
            className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </Field>
        <button className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Create account
        </button>
      </form>
    </AuthLayout>
  );
}
