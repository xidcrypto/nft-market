"use client";

import { usePathname } from "next/navigation";
import { Header } from "./components/header-component";
import { TabNavigation } from "./components/tab-navigation";

export function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <>
      <Header />
      <TabNavigation />
      <main className={`relative z-0 min-h-screen ${!isHome ? "pt-8 md:pt-12" : "pt-0"}`}>
        {children}
      </main>
    </>
  );
}
