"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SettingsModal from "@/components/layout/SettingsModal";

function ChatSharedLinkPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.push(from);
  };

  return <SettingsModal isOpen={isOpen} onClose={handleClose} />;
}

export default function ChatSharedLinksSettingsPage() {
  return (
    <Suspense fallback={null}>
      <ChatSharedLinkPageInner />
    </Suspense>
  );
}
