"use client";

import {
  AudioLines,
  BookOpenText,
  CircleHelp,
  GripVertical,
  Highlighter,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Share2,
  Sparkles,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BrandMark } from "@/components/layout/brand-mark";

type SidebarMode = "expanded" | "collapsed" | "floating";
type Point = { x: number; y: number };
type DragSession = {
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  sourceMode: SidebarMode;
};

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  shortcut?: string;
};

const primaryNavigation: NavigationItem[] = [
  { label: "Overview", icon: Home, active: true },
  { label: "Meetings", icon: UsersRound },
  { label: "Highlights", icon: Highlighter },
  { label: "Search", icon: Search, shortcut: "/" },
];

const libraryNavigation: NavigationItem[] = [
  { label: "My library", icon: BookOpenText },
  { label: "Shared with me", icon: Share2 },
];

const radialNavigation = [
  { label: "Overview", icon: Home, x: 0, y: -88 },
  { label: "Meetings", icon: UsersRound, x: 78, y: -44 },
  { label: "Highlights", icon: Highlighter, x: 78, y: 44 },
  { label: "Settings", icon: Settings, x: 0, y: 88 },
  { label: "Library", icon: BookOpenText, x: -78, y: 44 },
  { label: "Search", icon: Search, x: -78, y: -44 },
];

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const ORB_SIZE = 58;

function clampPosition(point: Point, viewport: typeof DEFAULT_VIEWPORT, radialSafe = false): Point {
  const horizontalMargin = radialSafe ? 94 : 16;
  const verticalMargin = radialSafe ? 94 : 16;

  return {
    x: Math.min(
      Math.max(point.x, horizontalMargin),
      Math.max(horizontalMargin, viewport.width - ORB_SIZE - horizontalMargin),
    ),
    y: Math.min(
      Math.max(point.y, verticalMargin),
      Math.max(verticalMargin, viewport.height - ORB_SIZE - verticalMargin),
    ),
  };
}

function NavigationButton({ item, compact }: { item: NavigationItem; compact: boolean }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      title={compact ? item.label : undefined}
      aria-label={compact ? item.label : undefined}
      className={`group flex h-10 w-full items-center rounded-xl text-sm transition-colors ${
        compact ? "justify-center px-0" : "gap-3 px-3"
      } ${
        item.active
          ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]"
          : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
      }`}
    >
      <Icon
        className={`size-[17px] shrink-0 transition-colors ${
          item.active ? "text-[#ff7a1a]" : "text-white/35 group-hover:text-white/65"
        }`}
        strokeWidth={1.8}
      />
      {!compact && <span className="font-medium">{item.label}</span>}
      {!compact && item.shortcut && (
        <span className="font-label ml-auto rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[9px] text-white/30">
          {item.shortcut}
        </span>
      )}
    </button>
  );
}

export function Sidebar() {
  const [mode, setMode] = useState<SidebarMode>("expanded");
  const [orbPosition, setOrbPosition] = useState<Point>({ x: 110, y: 132 });
  const [radialOpen, setRadialOpen] = useState(false);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef(DEFAULT_VIEWPORT);
  const didDragRef = useRef(false);

  useEffect(() => {
    const updateViewport = () => {
      viewportRef.current = { width: window.innerWidth, height: window.innerHeight };
      setOrbPosition((current) => clampPosition(current, viewportRef.current, radialOpen));
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, [radialOpen]);

  const startDragging = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, sourceMode: SidebarMode) => {
      if (event.button !== 0) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      didDragRef.current = false;
      setDragSession({
        startX: event.clientX,
        startY: event.clientY,
        offsetX: sourceMode === "floating" ? event.clientX - bounds.left : ORB_SIZE / 2,
        offsetY: sourceMode === "floating" ? event.clientY - bounds.top : ORB_SIZE / 2,
        sourceMode,
      });
      event.preventDefault();
    },
    [],
  );

  useEffect(() => {
    if (!dragSession) return;

    const handlePointerMove = (event: PointerEvent) => {
      const distance = Math.hypot(event.clientX - dragSession.startX, event.clientY - dragSession.startY);
      if (!didDragRef.current && distance < 7) return;

      didDragRef.current = true;
      setIsDragging(true);
      setMode("floating");
      setRadialOpen(false);
      setOrbPosition(
        clampPosition(
          { x: event.clientX - dragSession.offsetX, y: event.clientY - dragSession.offsetY },
          viewportRef.current,
        ),
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (didDragRef.current) {
        if (event.clientX <= 112) {
          setMode("expanded");
          setRadialOpen(false);
        } else {
          setMode("floating");
          setOrbPosition((current) => clampPosition(current, viewportRef.current, true));
        }
      } else if (dragSession.sourceMode === "floating") {
        setRadialOpen((current) => !current);
      }

      setIsDragging(false);
      setDragSession(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragSession]);

  if (mode === "floating") {
    return (
      <>
        {isDragging && (
          <div className="pointer-events-none fixed inset-y-0 left-0 z-40 hidden w-28 items-center justify-center border-r border-[#ff7a1a]/25 bg-[#ff7a1a]/[0.06] backdrop-blur-sm lg:flex">
            <span className="font-label -rotate-90 whitespace-nowrap text-[9px] tracking-[0.24em] text-[#ff9a52]">
              DROP TO DOCK
            </span>
          </div>
        )}

        <div
          className="fixed z-50 hidden size-[58px] lg:block"
          style={{ left: orbPosition.x, top: orbPosition.y }}
        >
          <nav aria-label="Floating navigation" aria-hidden={!radialOpen}>
            {radialNavigation.map((item, index) => {
              const Icon = item.icon;
              const transform = radialOpen
                ? `translate(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px)) scale(1)`
                : "translate(-50%, -50%) scale(0.45)";

              return (
                <button
                  key={item.label}
                  type="button"
                  tabIndex={radialOpen ? 0 : -1}
                  title={item.label}
                  aria-label={item.label}
                  className="absolute left-1/2 top-1/2 flex size-11 items-center justify-center rounded-full border border-white/10 bg-[#111119]/95 text-white/50 shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-[transform,opacity,color,background-color] duration-300 hover:border-[#ff7a1a]/35 hover:bg-[#1a1514] hover:text-[#ff8b36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a1a]"
                  style={{
                    opacity: radialOpen ? 1 : 0,
                    pointerEvents: radialOpen ? "auto" : "none",
                    transform,
                    transitionDelay: radialOpen ? `${index * 35}ms` : "0ms",
                  }}
                >
                  <Icon className="size-[17px]" strokeWidth={1.8} />
                </button>
              );
            })}
          </nav>

          <span className="absolute inset-[-9px] rounded-full border border-[#ff7a1a]/15 opacity-70" />
          <span className="absolute inset-[-17px] animate-ping rounded-full border border-[#ff7a1a]/10 [animation-duration:2.8s]" />
          <button
            type="button"
            onPointerDown={(event) => startDragging(event, "floating")}
            aria-label={radialOpen ? "Close floating navigation" : "Open floating navigation"}
            aria-expanded={radialOpen}
            title="Click for navigation · Drag to move · Drop left to dock"
            className={`relative z-10 flex size-[58px] touch-none select-none items-center justify-center rounded-full border shadow-[0_18px_48px_rgba(0,0,0,0.48),0_0_34px_rgba(255,122,26,0.16)] transition-[border-color,background-color,transform] active:cursor-grabbing ${
              isDragging
                ? "cursor-grabbing scale-105 border-[#ff9a52]/60 bg-[#21140f]"
                : "cursor-grab border-[#ff8b36]/35 bg-[#121219]/95 hover:scale-105 hover:border-[#ff9a52]/60"
            }`}
          >
            {radialOpen ? (
              <X className="size-5 text-[#ff8b36]" strokeWidth={2} />
            ) : (
              <AudioLines className="size-5 text-[#ff8b36]" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </>
    );
  }

  const compact = mode === "collapsed";

  return (
    <aside
      className={`glass-panel relative z-30 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] transition-[width] duration-300 lg:sticky lg:top-0 lg:flex ${
        compact ? "w-[76px]" : "w-[252px]"
      }`}
    >
      <div className={`flex h-20 items-center ${compact ? "flex-col justify-center gap-1 px-3" : "gap-2 px-3"}`}>
        <button
          type="button"
          onPointerDown={(event) => startDragging(event, mode)}
          aria-label="Drag navigation into a floating menu"
          title="Drag to turn the sidebar into a floating menu"
          className="group relative flex shrink-0 cursor-grab touch-none select-none items-center rounded-xl p-1 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[#ff7a1a]/60 active:cursor-grabbing"
        >
          <BrandMark compact />
          <GripVertical className="absolute -right-1.5 top-1/2 size-3 -translate-y-1/2 text-white/15 transition-colors group-hover:text-white/50" />
        </button>
        {!compact && (
          <div className="min-w-0 flex-1 leading-none">
            <p className="font-display truncate text-[17px] font-semibold tracking-[-0.035em] text-white">Echo</p>
            <p className="font-label mt-1 truncate text-[7px] font-medium tracking-[0.28em] text-white/35">
              MEETING INTELLIGENCE
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMode(compact ? "expanded" : "collapsed")}
          aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
          title={compact ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a1a]"
        >
          {compact ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className={`flex-1 space-y-7 py-5 ${compact ? "px-2.5" : "px-3"}`} aria-label="Primary navigation">
        <div className="space-y-1">
          {primaryNavigation.map((item) => (
            <NavigationButton key={item.label} item={item} compact={compact} />
          ))}
        </div>

        <div>
          {!compact && (
            <p className="font-label mb-2.5 px-3 text-[8px] font-medium tracking-[0.26em] text-white/25">
              LIBRARY
            </p>
          )}
          {compact && <div className="mx-auto mb-3 h-px w-7 bg-white/[0.08]" />}
          <div className="space-y-1">
            {libraryNavigation.map((item) => (
              <NavigationButton key={item.label} item={item} compact={compact} />
            ))}
          </div>
        </div>
      </nav>

      <div className={compact ? "p-2.5" : "p-3"}>
        {compact ? (
          <div className="space-y-1">
            <button
              type="button"
              title="12 hours saved this month"
              aria-label="12 hours saved this month"
              className="flex h-10 w-full items-center justify-center rounded-xl bg-orange-400/[0.09] text-[#ff7a1a]"
            >
              <Sparkles className="size-4" />
            </button>
            <button
              type="button"
              title="Settings"
              aria-label="Settings"
              className="flex h-10 w-full items-center justify-center rounded-xl text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/70"
            >
              <Settings className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-2xl border border-orange-300/10 bg-gradient-to-br from-orange-400/[0.09] to-transparent p-4">
              <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-[#ff7a1a] text-[#0a0a0f] shadow-[0_8px_24px_rgba(255,122,26,0.22)]">
                <Sparkles className="size-4" />
              </div>
              <p className="font-display text-sm font-semibold tracking-[-0.025em] text-white">12 hours saved</p>
              <p className="mt-1 text-[11px] leading-4 text-white/38">Across 18 meetings this month</p>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                className="flex h-9 items-center justify-center gap-2 rounded-lg text-xs text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/70"
              >
                <CircleHelp className="size-3.5" /> Help
              </button>
              <button
                type="button"
                className="flex h-9 items-center justify-center gap-2 rounded-lg text-xs text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/70"
              >
                <Settings className="size-3.5" /> Settings
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
