import { AudioLines } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl border border-orange-300/20 bg-orange-400/10 text-[#ff7a1a] shadow-[0_0_24px_rgba(255,122,26,0.12)]">
        <AudioLines className="size-[18px]" strokeWidth={2.2} />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="font-display text-[17px] font-semibold tracking-[-0.035em] text-white">
            Echo
          </p>
          <p className="font-label mt-1 text-[7px] font-medium tracking-[0.28em] text-white/35">
            MEETING INTELLIGENCE
          </p>
        </div>
      )}
    </div>
  );
}
