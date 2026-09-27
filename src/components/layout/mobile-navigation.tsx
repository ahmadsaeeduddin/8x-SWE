"use client";

import { Highlighter, Home, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { openGlobalSearch } from "@/lib/interface-events";

const items = [
  { label: "Overview", icon: Home, href: "/" },
  { label: "Meetings", icon: UsersRound, href: "/#meetings" },
  { label: "Highlights", icon: Highlighter, href: "/#highlights" },
  { label: "Search", icon: Search, search: true },
];

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-white/10 bg-[#0d0d13]/95 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.label === "Overview"
            ? pathname === "/"
            : item.label === "Meetings" && pathname.startsWith("/meetings");
        const className = `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-medium transition-colors ${
          isActive ? "bg-white/[0.07] text-white" : "text-white/35 hover:text-white/70"
        }`;
        const content = (
          <>
            <Icon
              className={`size-[17px] ${isActive ? "text-[#ff7a1a]" : ""}`}
              strokeWidth={1.8}
            />
            {item.label}
          </>
        );

        return item.href ? (
          <Link key={item.label} href={item.href} className={className}>
            {content}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            onClick={item.search ? openGlobalSearch : undefined}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
