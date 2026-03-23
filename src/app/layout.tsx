import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { LocaleManager } from "@/components/locale-manager";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rent Manage",
  description: "Property rent management application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rent Manage",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  applicationName: "Rent Manage",
  keywords: ["rent", "management", "property", "tenant", "payment"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <LocaleManager />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
