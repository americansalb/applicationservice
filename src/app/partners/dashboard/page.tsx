"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartnerDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/partners/intake");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-[#00626F] animate-pulse">Loading...</div>
    </div>
  );
}
