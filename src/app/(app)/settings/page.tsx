"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsModal from "@/components/layout/SettingsModal";

export default function GlobalSettingsPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  return <SettingsModal isOpen={isOpen} onClose={handleClose} />;
}
