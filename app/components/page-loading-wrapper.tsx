"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { PageLoadingOverlay } from "./loading-overlay";

type Stage = "loading" | "fading-out" | "ready";

interface PageLoadingWrapperProps {
  children: React.ReactNode;
  dataReady: boolean;
}

export function PageLoadingWrapper({
  children,
  dataReady,
}: PageLoadingWrapperProps) {
  const pathname = usePathname();
  const [stage, setStage] = useState<Stage>("loading");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Route change or mount: show overlay (3-stage: loading)
  useEffect(() => {
    if (!mounted) return;
    setStage("loading");

    // 8s max timeout - anti-stuck, forces to ready
    const timer = setTimeout(() => {
      setStage("ready");
    }, 8000);

    return () => clearTimeout(timer);
  }, [pathname, mounted]);

  // Data ready: start fade-out (loading → fading-out)
  useEffect(() => {
    if (!mounted || !dataReady || stage !== "loading") return;

    const timer = setTimeout(() => {
      setStage("fading-out");
    }, 450);

    return () => clearTimeout(timer);
  }, [dataReady, stage, mounted]);

  // Fade-out complete: show content (fading-out → ready)
  useEffect(() => {
    if (stage !== "fading-out") return;

    const timer = setTimeout(() => {
      setStage("ready");
    }, 500);

    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <>
      {stage === "loading" && <PageLoadingOverlay />}
      <div
        className={`transition-opacity duration-400 ease-out ${
          stage === "ready" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {children}
      </div>
    </>
  );
}
