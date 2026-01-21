"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, DoorOpen, CreditCard, BarChart3, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/tenants", icon: Users, label: "Tenants" },
    { href: "/rooms", icon: DoorOpen, label: "Rooms" },
    { href: "/payments", icon: CreditCard, label: "Payments" },
    { href: "/cash-management", icon: Wallet, label: "Cash Management" },
    { href: "/reports", icon: BarChart3, label: "Reports" },
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
