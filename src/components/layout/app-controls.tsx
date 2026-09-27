"use client";

import {
  ArrowUpRight,
  BookOpenText,
  Check,
  CircleHelp,
  Command,
  ExternalLink,
  FileUp,
  Highlighter,
  Moon,
  RotateCcw,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  OPEN_INTERFACE_PANEL_EVENT,
  openGlobalSearch,
  type InterfacePanel,
} from "@/lib/interface-events";

type AppearanceSettings = {
  theme: "dark" | "light";
  colorIntensity: number;
  contrast: number;
  surfaceBrightness: number;
  layerContrast: number;
};

type AppearanceKey = Exclude<keyof AppearanceSettings, "theme">;

const STORAGE_KEY = "echo-appearance-v1";
const APPEARANCE_UPDATED_EVENT = "echo:appearance-updated";
const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "dark",
  colorIntensity: 50,
  contrast: 50,
  surfaceBrightness: 50,
  layerContrast: 50,
};
const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_APPEARANCE);
let volatileSnapshot = DEFAULT_SNAPSHOT;

const appearanceControls: Array<{
  key: AppearanceKey;
  label: string;
  description: string;
  low: string;
  high: string;
}> = [
  {
    key: "colorIntensity",
    label: "Color intensity",
    description: "Controls how vivid interface colors appear.",
    low: "Muted",
    high: "Vivid",
  },
  {
    key: "contrast",
    label: "Contrast",
    description: "Controls the difference between text, borders, and backgrounds.",
    low: "Soft",
    high: "Crisp",
  },
  {
    key: "surfaceBrightness",
    label: "Surface brightness",
    description: "Controls how light or dark background surfaces appear.",
    low: "Darker",
    high: "Lighter",
  },
  {
    key: "layerContrast",
    label: "Layer contrast",
    description: "Controls the difference between stacked surfaces.",
    low: "Subtle",
    high: "Defined",
  },
];

function clampSetting(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : fallback;
}

function parseAppearance(snapshot: string): AppearanceSettings {
  try {
    const parsed = JSON.parse(snapshot) as Partial<AppearanceSettings>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      colorIntensity: clampSetting(
        parsed.colorIntensity,
        DEFAULT_APPEARANCE.colorIntensity,
      ),
      contrast: clampSetting(parsed.contrast, DEFAULT_APPEARANCE.contrast),
      surfaceBrightness: clampSetting(
        parsed.surfaceBrightness,
        DEFAULT_APPEARANCE.surfaceBrightness,
      ),
      layerContrast: clampSetting(
        parsed.layerContrast,
        DEFAULT_APPEARANCE.layerContrast,
      ),
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function getAppearanceSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? volatileSnapshot;
  } catch {
    return volatileSnapshot;
  }
}

function subscribeToAppearance(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(APPEARANCE_UPDATED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(APPEARANCE_UPDATED_EVENT, onStoreChange);
  };
}

function saveAppearance(settings: AppearanceSettings) {
  volatileSnapshot = JSON.stringify(settings);
  try {
    window.localStorage.setItem(STORAGE_KEY, volatileSnapshot);
  } catch {
    // The controls still work for the current session when storage is unavailable.
  }
  window.dispatchEvent(new Event(APPEARANCE_UPDATED_EVENT));
}

function valueLabel(value: number) {
  if (value < 34) return "Low";
  if (value > 66) return "High";
  return "Balanced";
}

function AppearanceControl({
  control,
  value,
  onChange,
}: {
  control: (typeof appearanceControls)[number];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label
            htmlFor={`appearance-${control.key}`}
            className="text-[13px] font-medium text-white/78"
          >
            {control.label}
          </label>
          <p className="mt-1 text-[11px] leading-4 text-white/35">
            {control.description}
          </p>
        </div>
        <span className="font-label rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 text-[8px] tracking-[0.08em] text-[#ff9a52]">
          {valueLabel(value)}
        </span>
      </div>
      <input
        id={`appearance-${control.key}`}
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="appearance-slider mt-4 w-full"
        style={{ "--appearance-progress": `${value}%` } as CSSProperties}
      />
      <div className="font-label mt-2 flex justify-between text-[7px] tracking-[0.1em] text-white/22">
        <span>{control.low.toUpperCase()}</span>
        <span>{control.high.toUpperCase()}</span>
      </div>
    </div>
  );
}

function SettingsContent({
  appearance,
  onChange,
  onThemeToggle,
  onReset,
}: {
  appearance: AppearanceSettings;
  onChange: (key: AppearanceKey, value: number) => void;
  onThemeToggle: () => void;
  onReset: () => void;
}) {
  const isLight = appearance.theme === "light";

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#ff8b36]">
            <SlidersHorizontal className="size-4" />
            <span className="font-label text-[8px] tracking-[0.22em]">
              APPEARANCE
            </span>
          </div>
          <h3 className="font-display mt-3 text-lg font-semibold tracking-[-0.03em] text-white">
            Tune your workspace
          </h3>
          <p className="mt-1 text-xs leading-5 text-white/35">
            Changes preview instantly and are saved on this device.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-2 text-[10px] text-white/38 transition hover:bg-white/[0.04] hover:text-white/70"
        >
          <RotateCcw className="size-3" /> Reset
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/15 text-[#ff9950]">
              {isLight ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white/78">Light theme</p>
              <p className="mt-1 text-[11px] leading-4 text-white/35">
                Switch between the dark and light interface.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isLight}
            aria-label="Use light theme"
            onClick={onThemeToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
              isLight
                ? "border-[#ff7a1a]/45 bg-[#ff7a1a]"
                : "border-white/[0.1] bg-white/[0.06]"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#17171f] shadow-md transition-transform ${
                isLight ? "translate-x-[1.55rem]" : "translate-x-0.5"
              }`}
            >
              {isLight ? <Sun className="size-3" /> : <Moon className="size-3" />}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {appearanceControls.map((control) => (
          <AppearanceControl
            key={control.key}
            control={control}
            value={appearance[control.key]}
            onChange={(value) => onChange(control.key, value)}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-[#ff7a1a]/12 bg-[#ff7a1a]/[0.055] px-3.5 py-3 text-[10px] leading-4 text-white/40">
        <Check className="size-3.5 shrink-0 text-[#ff8b36]" />
        Appearance preferences save automatically.
      </div>
    </>
  );
}

function HelpContent({ closePanel }: { closePanel: () => void }) {
  const helpItems = [
    {
      icon: Search,
      title: "Find anything",
      detail: "Search meeting titles, speakers, or any phrase in a transcript.",
      action: "Search workspace",
      onClick: () => {
        closePanel();
        window.setTimeout(openGlobalSearch, 0);
      },
    },
    {
      icon: FileUp,
      title: "Import a transcript",
      detail: "Create a meeting from a formatted TXT or JSON transcript.",
      action: "New meeting",
      href: "/meetings/new",
    },
    {
      icon: Highlighter,
      title: "Review the intelligence",
      detail: "Open a meeting for its summary, transcript, decisions, and highlights.",
      action: "Browse meetings",
      href: "/#meetings",
    },
  ];

  return (
    <>
      <div className="rounded-2xl border border-[#64d3ff]/12 bg-gradient-to-br from-[#64d3ff]/[0.07] to-transparent p-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#64d3ff]/10 text-[#64d3ff]">
          <CircleHelp className="size-[18px]" />
        </div>
        <h3 className="font-display mt-4 text-lg font-semibold tracking-[-0.03em] text-white">
          Get around Echo
        </h3>
        <p className="mt-2 text-xs leading-5 text-white/40">
          Everything you need to turn a transcript into a searchable meeting recap.
        </p>
      </div>

      <div className="mt-5 space-y-2.5">
        {helpItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/42">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white/72">{item.title}</p>
                <p className="mt-1 text-[10px] leading-4 text-white/32">
                  {item.detail}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-medium text-[#ff9950]">
                  {item.action} <ArrowUpRight className="size-3" />
                </span>
              </div>
            </>
          );

          return item.href ? (
            <Link
              key={item.title}
              href={item.href}
              onClick={closePanel}
              className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              {content}
            </Link>
          ) : (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="flex w-full gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              {content}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/15 p-4">
        <p className="font-label text-[8px] tracking-[0.2em] text-white/28">
          KEYBOARD SHORTCUTS
        </p>
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/42">
          <span>Open search</span>
          <span className="flex items-center gap-1">
            <kbd className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-white/45">
              <Command className="size-3" />
            </kbd>
            <kbd className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-white/45">
              K
            </kbd>
            <span className="mx-1 text-white/18">or</span>
            <kbd className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-white/45">
              /
            </kbd>
          </span>
        </div>
      </div>
    </>
  );
}

function SharedContent({ closePanel }: { closePanel: () => void }) {
  return (
    <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
      <div className="relative flex size-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/35">
        <Share2 className="size-6" />
        <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#111118] bg-[#64d3ff]" />
      </div>
      <h3 className="font-display mt-5 text-lg font-semibold tracking-[-0.03em] text-white">
        Shared meetings open by link
      </h3>
      <p className="mt-2 max-w-xs text-xs leading-5 text-white/36">
        Echo currently uses public, read-only share links. Open a link you received,
        or create one from a meeting detail page.
      </p>
      <Link
        href="/#meetings"
        onClick={closePanel}
        className="mt-6 flex items-center gap-2 rounded-xl bg-[#ff7a1a] px-4 py-2.5 text-xs font-semibold text-[#09090d] transition hover:bg-[#ff8b38]"
      >
        <BookOpenText className="size-3.5" /> Browse your meetings
      </Link>
      <div className="mt-5 flex items-center gap-1.5 text-[9px] text-white/24">
        <ExternalLink className="size-3" /> No login is required for public links
      </div>
    </div>
  );
}

function PanelShell({
  panel,
  title,
  eyebrow,
  onClose,
  children,
}: {
  panel: InterfacePanel;
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const Icon = panel === "settings" ? Settings : panel === "help" ? CircleHelp : Share2;

  return (
    <div
      className="fixed inset-0 z-[120] flex justify-end bg-black/65 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="interface-panel-title"
        className="flex h-full w-full flex-col border-l border-white/[0.09] bg-[#0d0d14]/98 shadow-[-30px_0_90px_rgba(0,0,0,0.55)] sm:max-w-[470px]"
      >
        <header className="flex h-20 shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 sm:px-6">
          <div className="flex size-9 items-center justify-center rounded-xl border border-[#ff7a1a]/15 bg-[#ff7a1a]/[0.07] text-[#ff8b36]">
            <Icon className="size-4" />
          </div>
          <div>
            <p className="font-label text-[7px] tracking-[0.22em] text-white/25">
              {eyebrow}
            </p>
            <h2
              id="interface-panel-title"
              className="font-display mt-1 text-base font-semibold tracking-[-0.025em] text-white"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="ml-auto flex size-9 items-center justify-center rounded-xl text-white/32 transition hover:bg-white/[0.05] hover:text-white/75"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </aside>
    </div>
  );
}

export function AppControls() {
  const [activePanel, setActivePanel] = useState<InterfacePanel | null>(null);
  const snapshot = useSyncExternalStore(
    subscribeToAppearance,
    getAppearanceSnapshot,
    () => DEFAULT_SNAPSHOT,
  );
  const appearance = useMemo(() => parseAppearance(snapshot), [snapshot]);

  useEffect(() => {
    const root = document.documentElement;
    const saturation = 0.55 + appearance.colorIntensity * 0.009;
    const contrast = 0.8 + appearance.contrast * 0.004;
    const brightness = 0.82 + appearance.surfaceBrightness * 0.0036;
    const layerBorder = 0.02 + appearance.layerContrast * 0.0012;

    root.dataset.theme = appearance.theme;
    root.style.setProperty("--appearance-saturation", saturation.toFixed(3));
    root.style.setProperty("--appearance-contrast", contrast.toFixed(3));
    root.style.setProperty("--appearance-brightness", brightness.toFixed(3));
    root.style.setProperty("--appearance-layer-border", layerBorder.toFixed(3));
  }, [appearance]);

  useEffect(() => {
    const openPanel = (event: Event) => {
      setActivePanel((event as CustomEvent<InterfacePanel>).detail);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePanel(null);
    };

    window.addEventListener(OPEN_INTERFACE_PANEL_EVENT, openPanel);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener(OPEN_INTERFACE_PANEL_EVENT, openPanel);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = activePanel ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activePanel]);

  const updateAppearance = (key: AppearanceKey, value: number) => {
    saveAppearance({ ...appearance, [key]: value });
  };

  const closePanel = () => setActivePanel(null);

  if (!activePanel) return null;

  if (activePanel === "settings") {
    return (
      <PanelShell
        panel="settings"
        title="Settings"
        eyebrow="WORKSPACE"
        onClose={closePanel}
      >
        <SettingsContent
          appearance={appearance}
          onChange={updateAppearance}
          onThemeToggle={() =>
            saveAppearance({
              ...appearance,
              theme: appearance.theme === "dark" ? "light" : "dark",
            })
          }
          onReset={() => saveAppearance(DEFAULT_APPEARANCE)}
        />
      </PanelShell>
    );
  }

  if (activePanel === "help") {
    return (
      <PanelShell panel="help" title="Help center" eyebrow="ECHO GUIDE" onClose={closePanel}>
        <HelpContent closePanel={closePanel} />
      </PanelShell>
    );
  }

  return (
    <PanelShell panel="shared" title="Shared with me" eyebrow="LIBRARY" onClose={closePanel}>
      <SharedContent closePanel={closePanel} />
    </PanelShell>
  );
}
