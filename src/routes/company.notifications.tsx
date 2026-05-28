import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "./app.notifications";

export const Route = createFileRoute("/company/notifications")({
  component: CompanyNotifications,
});

function CompanyNotifications() {
  return (
    <NotificationsPage emptyStateBody="Notifications appear here when candidates apply, accept matches, or send messages." />
  );
}
