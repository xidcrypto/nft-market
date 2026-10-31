"use client";

import { usePathname } from "next/navigation";
import { Header } from "./components/header-component";
import { TabNavigation } from "./components/tab-navigation";

export function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <TabNavigation />
      <main className="relative z-0 min-h-screen pt-8 md:pt-12">
        {children}
      </main>
    </>
  );
}
