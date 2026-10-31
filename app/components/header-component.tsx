import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md h-[56px]">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center h-full">
        <Link
          href="/"
          className="flex items-center gap-2"
        >
          <svg
            className="w-6 h-6 text-accent-gold"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-primary font-semibold tracking-tight">Aegis Crown</span>
            <span className="text-secondary text-xs tracking-widest uppercase">AEGIS</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
