import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jsonPath = join(process.cwd(), "data", "trading-data.json");

    if (!existsSync(jsonPath)) {
      // Return empty trading data instead of 404 so the dashboard renders gracefully
      return NextResponse.json({
        summary: {
          totalPnl: 0, totalTrades: 0, winRate: 0, openPositions: 0,
          sharpeRatio: 0, maxDrawdown: 0, profitFactor: 0,
          avgWin: 0, avgLoss: 0, totalFees: 0, currentEquity: 0,
        },
        equityCurve: [],
        byAsset: [],
        byStrategy: [],
        byTier: [],
        recentTrades: [],
        openPositions: [],
      });
    }

    const raw = readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Trading API error:", error);
    return NextResponse.json(
      { error: "Failed to load trading data" },
      { status: 500 }
    );
  }
}
