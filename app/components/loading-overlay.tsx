"use client";

export function PageLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      <svg
        className="w-16 h-16 text-accent-gold mb-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
      <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-secondary">Loading…</p>
    </div>
  );
}
