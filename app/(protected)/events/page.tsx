import { Metadata } from "next";
import EventsPageClient from "./eventsclient";

export const metadata: Metadata = {
  title: "Events | Admin Panel",
  description: "Manage event records, enrollments, and institution filters",
};

export default async function EventsPage() {
  return <EventsPageClient />;
}
