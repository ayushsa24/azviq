"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsModal from "@/components/layout/SettingsModal";

export default function SettingsPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.push("/dashboard");
  };

  return <SettingsModal isOpen={isOpen} onClose={handleClose} />;
}
