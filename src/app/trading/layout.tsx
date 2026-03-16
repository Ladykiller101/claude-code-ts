import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIFred — AI Trading Intelligence",
  description: "Multi-agent AI trading system — investor dashboard",
};

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
