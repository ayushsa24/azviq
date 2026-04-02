"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TrashModal from "@/components/layout/TrashModal";

export default function GlobalTrashPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  return <TrashModal isOpen={isOpen} onClose={handleClose} />;
}
