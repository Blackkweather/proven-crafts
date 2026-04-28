import { createFileRoute } from "@tanstack/react-router";
import { InboxPage } from "./app.inbox";

export const Route = createFileRoute("/company/inbox")({
  component: InboxPage,
});
