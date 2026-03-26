"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const TradingSettings = dynamic(
  () => import("@/components/trading/TradingSettings"),
  { ssr: false }
);

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#06060a] flex items-center justify-center text-white">Loading settings...</div>}>
      <TradingSettings />
    </Suspense>
  );
}
