import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rent Management System",
  description: "Manage your rental properties efficiently",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
