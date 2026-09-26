import { Highlighter, Home, Search, UsersRound } from "lucide-react";

const items = [
  { label: "Overview", icon: Home, active: true },
  { label: "Meetings", icon: UsersRound },
  { label: "Highlights", icon: Highlighter },
  { label: "Search", icon: Search },
];

export function MobileNavigation() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-white/10 bg-[#0d0d13]/95 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-medium transition-colors ${
              item.active ? "bg-white/[0.07] text-white" : "text-white/35 hover:text-white/70"
            }`}
          >
            <Icon className={`size-[17px] ${item.active ? "text-[#ff7a1a]" : ""}`} strokeWidth={1.8} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
