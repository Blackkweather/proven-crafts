import { createFileRoute } from "@tanstack/react-router";
import { InboxPage } from "./app.inbox";

export const Route = createFileRoute("/company/inbox")({
  component: InboxPage,
  validateSearch: (s: Record<string, unknown>) => ({
    conv: s.conv as string | undefined,
  }),
});
