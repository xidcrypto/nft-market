"use client";

export function LoadingOverlay({
  isLoading,
  label = "Loading...",
}: {
  isLoading: boolean;
  label?: string;
}) {
  if (!isLoading) return null;

  return (
    <div
      className="relative"
      aria-busy="true"
      aria-label={label}
    >
      {/* Overlay scoped to content area - semi-transparent, not black */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          {/* Gold spinner */}
          <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-secondary">{label}</p>
        </div>
      </div>
      
      {/* Skeleton placeholder behind overlay */}
      <div className="space-y-4 opacity-30 pointer-events-none">
        <div className="h-8 w-full animate-skeleton" />
        <div className="h-8 w-full animate-skeleton" />
        <div className="h-8 w-full animate-skeleton" />
      </div>
    </div>
  );
}
