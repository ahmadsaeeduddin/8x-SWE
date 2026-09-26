"use client";

import Link from "next/link";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ShareMeetingButton({ token }: { token: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const sharePath = `/share/${token}`;

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const copyShareLink = async () => {
    const shareUrl = new URL(sharePath, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.07] hover:text-white"
      >
        <Share2 className="size-3.5" /> Share
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Share meeting"
          className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/[0.11] bg-[#0d0d14]/98 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff8b36]">
              <Share2 className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-white/85">Public meeting link</h2>
              <p className="mt-1 text-[11px] leading-4 text-white/35">
                Anyone with this link can view the summary, action items, and highlights. No login is required.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 p-1.5 pl-3">
            <p className="font-label min-w-0 flex-1 truncate text-[9px] text-white/40">{sharePath}</p>
            <button
              type="button"
              onClick={copyShareLink}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium transition-colors ${
                copied ? "bg-[#64d3ff]/10 text-[#64d3ff]" : "bg-white/[0.06] text-white/55 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <Link
            href={sharePath}
            target="_blank"
            onClick={() => setIsOpen(false)}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7a1a] text-[11px] font-semibold text-[#09090d] transition-colors hover:bg-[#ff8b38]"
          >
            Open public view <ExternalLink className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
