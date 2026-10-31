"use client";

import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-background/80 backdrop-blur-md">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
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

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/market"
            className="text-primary hover:text-accent-gold transition-colors"
          >
            Market
          </Link>
          <Link
            href="#mint"
            className="text-primary hover:text-accent-gold transition-colors"
          >
            Mint for Agents
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-primary focus:outline-none"
          onClick={() => setOpen(!open)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral-800 bg-background">
          <nav className="py-4 space-y-4">
            <Link
              href="/market"
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-primary hover:text-accent-gold transition-colors"
            >
              Market
            </Link>
            <Link
              href="#mint"
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-primary hover:text-accent-gold transition-colors"
            >
              Mint for Agents
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
