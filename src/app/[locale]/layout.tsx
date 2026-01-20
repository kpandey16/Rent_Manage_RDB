import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Rent Manage",
  description: "Property rent management application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rent Manage",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await params in Next.js 15+
  const { locale } = await params;

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased font-sans">
        <NextIntlClientProvider messages={messages}>
          <div className="relative min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pb-20 md:pb-0">
              {children}
            </main>
            <BottomNav />
          </div>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
