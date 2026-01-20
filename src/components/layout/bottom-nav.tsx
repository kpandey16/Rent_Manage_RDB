"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Home, Users, DoorOpen, CreditCard, BarChart3, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();

  const navItems = [
    { href: `/${locale}`, icon: Home, label: t('nav.dashboard') },
    { href: `/${locale}/tenants`, icon: Users, label: t('nav.tenants') },
    { href: `/${locale}/rooms`, icon: DoorOpen, label: t('nav.rooms') },
    { href: `/${locale}/payments`, icon: CreditCard, label: t('nav.payments') },
    { href: `/${locale}/cash-management`, icon: Wallet, label: t('nav.cashManagement') },
    { href: `/${locale}/reports`, icon: BarChart3, label: t('nav.reports') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
