"use client";

import {
  AlertTriangle,
  LoaderCircle,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DeleteMeetingButtonProps = {
  meetingId: string;
  meetingTitle: string;
};

export function DeleteMeetingButton({
  meetingId,
  meetingTitle,
}: DeleteMeetingButtonProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!confirmOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        setConfirmOpen(false);
        setError(null);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [confirmOpen, isDeleting]);

  async function deleteMeeting() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/meetings/${encodeURIComponent(meetingId)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "The meeting could not be deleted.");
      }

      setConfirmOpen(false);
      setMenuOpen(false);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The meeting could not be deleted.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function closeDialog() {
    if (isDeleting) return;
    setConfirmOpen(false);
    setError(null);
  }

  return (
    <div ref={menuRef} className="relative z-20">
      <button
        type="button"
        aria-label={`More options for ${meetingTitle}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
        className="flex size-8 items-center justify-center rounded-lg text-white/28 transition-colors hover:bg-white/[0.06] hover:text-white/75"
      >
        <MoreHorizontal className="size-[18px]" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-10 w-44 rounded-xl border border-white/[0.1] bg-[#17171f] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-red-300/85 transition-colors hover:bg-red-500/[0.1] hover:text-red-200"
          >
            <Trash2 className="size-3.5" />
            Delete meeting
          </button>
        </div>
      )}

      {confirmOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDialog();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-meeting-title"
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111118] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.7)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-500/[0.08] to-transparent" />
              <button
                type="button"
                aria-label="Close delete confirmation"
                disabled={isDeleting}
                onClick={closeDialog}
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="size-4" />
              </button>

              <div className="relative flex size-10 items-center justify-center rounded-xl border border-red-400/15 bg-red-500/[0.09] text-red-300">
                <AlertTriangle className="size-[18px]" />
              </div>
              <h2
                id="delete-meeting-title"
                className="font-display relative mt-5 text-xl font-semibold tracking-[-0.025em] text-white"
              >
                Delete this meeting?
              </h2>
              <p className="relative mt-2 text-sm leading-6 text-white/48">
                <span className="font-medium text-white/75">{meetingTitle}</span>{" "}
                and its transcript, summary, action items, highlights, and share
                links will be permanently removed.
              </p>

              {error && (
                <p
                  role="alert"
                  className="relative mt-4 rounded-lg border border-red-400/15 bg-red-500/[0.08] px-3 py-2 text-xs leading-5 text-red-200/85"
                >
                  {error}
                </p>
              )}

              <div className="relative mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={closeDialog}
                  className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={deleteMeeting}
                  className="flex min-w-32 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(239,68,68,0.2)] transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? (
                    <>
                      <LoaderCircle className="size-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      Delete meeting
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
