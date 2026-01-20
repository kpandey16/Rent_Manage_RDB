"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Menu, Bell, Home, Users, DoorOpen, CreditCard, BarChart3, Wallet, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Navigation items with translation keys
  const navItems = [
    { href: `/${locale}`, icon: Home, label: t('nav.dashboard') },
    { href: `/${locale}/tenants`, icon: Users, label: t('nav.tenants') },
    { href: `/${locale}/rooms`, icon: DoorOpen, label: t('nav.rooms') },
    { href: `/${locale}/payments`, icon: CreditCard, label: t('nav.payments') },
    { href: `/${locale}/cash-management`, icon: Wallet, label: t('nav.cashManagement') },
    { href: `/${locale}/reports`, icon: BarChart3, label: t('nav.reports') },
  ];

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        toast.success(t('auth.logoutSuccess'));
        router.push(`/${locale}/login`);
        router.refresh();
      } else {
        toast.error(t('common.error'));
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("An error occurred during logout");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle className="text-left">{t('common.appName')}</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 font-semibold">
          <span className="text-lg">{t('common.appName')}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-8 hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />

          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('nav.settings')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {loggingOut ? t('common.loading') : t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
