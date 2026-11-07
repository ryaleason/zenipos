import type { Metadata } from "next";
import Dashboard from "@/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | Zenipos",
  description: "Hotel Management & Reservation Dashboard",
};

export default function DashboardPage() {
  return <Dashboard />;
}
