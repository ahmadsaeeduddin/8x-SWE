"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock3, Command, FileAudio, MessageSquareText, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { productDesignReviewMeeting } from "@/lib/mock-meeting-detail";

type SearchResult = {
  id: string;
  kind: "meeting" | "transcript";
  title: string;
  detail: string;
  meta: string;
  href: string;
};

function matchesQuery(value: string, query: string) {
  const normalizedValue = value.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => normalizedValue.includes(word));
}

function transcriptSnippet(text: string, query: string) {
  const firstWord = query.toLowerCase().split(/\s+/).find(Boolean) ?? "";
  const matchIndex = text.toLowerCase().indexOf(firstWord);
  if (matchIndex < 0 || text.length <= 142) return text;

  const start = Math.max(0, matchIndex - 48);
  const end = Math.min(text.length, matchIndex + firstWord.length + 86);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function HighlightMatch({ text, query }: { text: string; query: string }): ReactNode {
  const firstWord = query.trim().split(/\s+/)[0];
  if (!firstWord) return text;

  const matchIndex = text.toLowerCase().indexOf(firstWord.toLowerCase());
  if (matchIndex < 0) return text;

  return (
    <>
      {text.slice(0, matchIndex)}
      <mark className="rounded-sm bg-[#ff7a1a]/18 px-0.5 text-[#ffad70]">
        {text.slice(matchIndex, matchIndex + firstWord.length)}
      </mark>
      {text.slice(matchIndex + firstWord.length)}
    </>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo<SearchResult[]>(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];

    const matches: SearchResult[] = [];

    if (matchesQuery(productDesignReviewMeeting.title, normalizedQuery)) {
      matches.push({
        id: productDesignReviewMeeting.id,
        kind: "meeting",
        title: productDesignReviewMeeting.title,
        detail: productDesignReviewMeeting.purpose,
        meta: `${productDesignReviewMeeting.date} · ${productDesignReviewMeeting.duration} · ${productDesignReviewMeeting.participants.length} participants`,
        href: `/meetings/${productDesignReviewMeeting.id}`,
      });
    }

    const transcriptMatches = productDesignReviewMeeting.transcript
      .filter((segment) => matchesQuery(`${segment.speaker} ${segment.text}`, normalizedQuery))
      .slice(0, 6)
      .map<SearchResult>((segment) => ({
        id: segment.id,
        kind: "transcript",
        title: `${segment.speaker} · ${segment.timestamp}`,
        detail: transcriptSnippet(segment.text, normalizedQuery),
        meta: productDesignReviewMeeting.title,
        href: `/meetings/${productDesignReviewMeeting.id}#${segment.id}`,
      }));

    return [...matches, ...transcriptMatches];
  }, [query]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (event.key === "/" && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const openResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    router.push(result.href);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      openResult(results[activeIndex] ?? results[0]);
    }
  };

  const meetingResults = results.filter((result) => result.kind === "meeting");
  const transcriptResults = results.filter((result) => result.kind === "transcript");

  return (
    <div ref={containerRef} className="relative order-3 w-full sm:order-none sm:max-w-md lg:max-w-lg">
      <label
        className={`flex h-11 w-full items-center gap-3 rounded-xl border bg-white/[0.035] px-3.5 transition-colors ${
          isOpen ? "border-white/[0.17] bg-white/[0.055]" : "border-white/[0.08]"
        }`}
      >
        <Search className="size-[17px] shrink-0 text-white/30" strokeWidth={1.8} />
        <span className="sr-only">Search meetings and transcripts</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search meetings or transcripts..."
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/28"
        />
        <span className="font-label hidden items-center gap-1 rounded-md border border-white/10 bg-black/20 px-1.5 py-1 text-[8px] text-white/28 min-[420px]:flex">
          <Command className="size-2.5" /> K
        </span>
      </label>

      {isOpen && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.65rem)] z-50 max-h-[min(34rem,70vh)] overflow-y-auto rounded-2xl border border-white/[0.11] bg-[#0d0d14]/98 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
        >
          {!query.trim() && (
            <div className="flex items-start gap-3 px-3 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ff7a1a]/10 text-[#ff8b36]">
                <Search className="size-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/65">Search this workspace</p>
                <p className="mt-1 text-[11px] leading-4 text-white/30">
                  Find the Product design review or search inside its complete transcript.
                </p>
              </div>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="px-4 py-10 text-center">
              <Search className="mx-auto size-5 text-white/18" />
              <p className="mt-3 text-sm text-white/45">No results for “{query.trim()}”</p>
              <p className="mt-1 text-[10px] text-white/25">Try a meeting title, speaker, or phrase from the transcript.</p>
            </div>
          )}

          {meetingResults.length > 0 && (
            <div>
              <p className="font-label px-3 pb-2 pt-2 text-[8px] tracking-[0.2em] text-white/25">MEETINGS</p>
              {meetingResults.map((result) => {
                const resultIndex = results.indexOf(result);
                return (
                  <Link
                    key={result.id}
                    href={result.href}
                    role="option"
                    aria-selected={activeIndex === resultIndex}
                    onMouseEnter={() => setActiveIndex(resultIndex)}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`group flex gap-3 rounded-xl p-3 transition-colors ${
                      activeIndex === resultIndex ? "bg-white/[0.07]" : "hover:bg-white/[0.045]"
                    }`}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#ff7a1a]/15 bg-[#ff7a1a]/[0.08] text-[#ff8b36]">
                      <FileAudio className="size-[17px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[13px] font-medium text-white/78">
                          <HighlightMatch text={result.title} query={query} />
                        </p>
                        <ArrowUpRight className="size-3.5 shrink-0 text-white/20 transition-colors group-hover:text-[#ff8b36]" />
                      </div>
                      <p className="mt-1 line-clamp-1 text-[10px] text-white/30">{result.meta}</p>
                      <p className="mt-1.5 line-clamp-1 text-[11px] text-white/42">{result.detail}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {transcriptResults.length > 0 && (
            <div className={meetingResults.length ? "mt-2 border-t border-white/[0.06] pt-2" : ""}>
              <div className="flex items-center justify-between px-3 pb-2 pt-2">
                <p className="font-label text-[8px] tracking-[0.2em] text-white/25">TRANSCRIPT MATCHES</p>
                <span className="font-label text-[8px] text-white/20">{transcriptResults.length} FOUND</span>
              </div>
              {transcriptResults.map((result) => {
                const resultIndex = results.indexOf(result);
                const [, timestamp = ""] = result.title.split(" · ");
                const speaker = result.title.replace(` · ${timestamp}`, "");

                return (
                  <Link
                    key={result.id}
                    href={result.href}
                    role="option"
                    aria-selected={activeIndex === resultIndex}
                    onMouseEnter={() => setActiveIndex(resultIndex)}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`group flex gap-3 rounded-xl p-3 transition-colors ${
                      activeIndex === resultIndex ? "bg-white/[0.07]" : "hover:bg-white/[0.045]"
                    }`}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/35">
                      <MessageSquareText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[11px] font-medium text-white/60">{speaker}</p>
                        <span className="font-label flex items-center gap-1 text-[8px] text-[#ff9950]">
                          <Clock3 className="size-2.5" /> {timestamp}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-white/42">
                        <HighlightMatch text={result.detail} query={query} />
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[9px] text-white/22">
                        <UsersRound className="size-2.5" /> {result.meta}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
