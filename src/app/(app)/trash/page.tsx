"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TrashModal from "@/components/layout/TrashModal";

function TrashPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.push(from);
  };

  return <TrashModal isOpen={isOpen} onClose={handleClose} />;
}

export default function GlobalTrashPage() {
  return (
    <Suspense fallback={null}>
      <TrashPageContent />
    </Suspense>
  );
}
