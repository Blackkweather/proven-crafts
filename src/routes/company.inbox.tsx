import { createFileRoute } from "@tanstack/react-router";
import { Route as InboxRoute } from "./app.inbox";

// Reuse the talent inbox component for the company side.
export const Route = createFileRoute("/company/inbox")({
  component: InboxRoute.options.component!,
});
