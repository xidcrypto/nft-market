"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "/", label: "Home" },
  { path: "/mint", label: "Mint" },
  { path: "/market", label: "Market" },
  { path: "/about", label: "About" },
];

export function TabNavigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top tab bar */}
      <div className="hidden md:block sticky top-[56px] z-10 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-8 h-[44px]">
            {TABS.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2 border-transparent ${
                    isActive
                      ? "text-accent-gold border-accent-gold"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile tab bar - second row below header, rata kiri, scroll horizontal */}
      <div className="md:hidden border-b border-border bg-background">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <div className="flex gap-6 py-3">
            {TABS.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`whitespace-nowrap text-sm font-medium transition-colors duration-150 shrink-0 ${
                    isActive
                      ? "text-accent-gold"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
