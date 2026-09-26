import { Bell, Command, Plus, Search } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#05050a]/80 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="mr-auto lg:hidden">
          <BrandMark />
        </div>

        <label className="order-3 flex h-11 w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 transition-colors focus-within:border-white/[0.16] focus-within:bg-white/[0.05] sm:order-none sm:max-w-md lg:max-w-lg">
          <Search className="size-[17px] shrink-0 text-white/30" strokeWidth={1.8} />
          <span className="sr-only">Search meetings</span>
          <input
            type="search"
            placeholder="Search meetings, people, or topics..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/28"
          />
          <span className="font-label hidden items-center gap-1 rounded-md border border-white/10 bg-black/20 px-1.5 py-1 text-[8px] text-white/28 min-[420px]:flex">
            <Command className="size-2.5" /> K
          </span>
        </label>

        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <Bell className="size-[17px]" strokeWidth={1.8} />
            <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-[#ff7a1a] ring-2 ring-[#0a0a0f]" />
          </button>
          <Button className="h-10 rounded-xl bg-[#ff7a1a] px-3.5 text-xs font-semibold text-[#0a0a0f] shadow-[0_8px_28px_rgba(255,122,26,0.2)] hover:bg-[#ff8b38] sm:px-4 sm:text-sm">
            <Plus className="size-4" strokeWidth={2.2} />
            <span className="hidden min-[420px]:inline">New meeting</span>
            <span className="min-[420px]:hidden">New</span>
          </Button>
          <button
            type="button"
            aria-label="Open profile"
            className="hidden size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#68483b] to-[#2a2528] font-display text-[11px] font-semibold text-white ring-1 ring-white/10 sm:flex"
          >
            SK
          </button>
        </div>
      </div>
    </header>
  );
}
