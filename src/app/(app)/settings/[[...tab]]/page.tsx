"use client";

import { useEffect, useState, Suspense, use } from "react";
import { useSettings } from "@/contexts/SettingsContext";


interface PageProps {
  params: Promise<{ tab?: string[] }>;
}

function SettingsPageInner({ params }: PageProps) {
  const { openSettings, isOpen } = useSettings();
  const resolvedParams = use(params);
  const tab = resolvedParams.tab?.[0] || "general";

  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    // If we land on this page directly, trigger the global settings modal
    // but only if it's not already open and haven't triggered it yet.
    if (!isOpen && !hasTriggered) {
      openSettings(tab);
      setHasTriggered(true);
    }
  }, [tab, openSettings, isOpen, hasTriggered]);

  // We render a clean, empty background. 
  // The Global SettingsModal (rendered in AppShell) will provide the UI.
  return <div className="flex-1 w-full h-full bg-transparent" />;
}

export default function GlobalSettingsPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner params={params} />
    </Suspense>
  );
}
