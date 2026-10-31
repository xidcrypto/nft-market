"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "/", label: "Home" },
  { path: "/mint", label: "Mint" },
  { path: "/market", label: "Market" },
  { path: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md h-[56px]">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        {/* Logo kiri */}
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

        {/* Nav kanan (desktop only) */}
        <nav className="hidden md:flex items-center gap-6">
          {TABS.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "text-accent-gold"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Baris kedua navigasi (mobile only) — rata kiri, scroll horizontal */}
      <div className="md:hidden border-b border-border bg-background">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto whitespace-nowrap">
          <div className="flex gap-6 py-3">
            {TABS.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`whitespace-nowrap text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "text-accent-gold"
                      : "text-secondary hover:text-primary"
                  } shrink-0`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
