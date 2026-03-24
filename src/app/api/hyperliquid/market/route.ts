import { NextRequest, NextResponse } from "next/server";
import { getMarketData } from "@/lib/hyperliquid";

export const dynamic = "force-dynamic";

/**
 * GET /api/hyperliquid/market?symbol=BTC-PERP
 *
 * Returns market data: price, 24h change, volume, funding rate.
 * No authentication required (public data).
 */
export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "Missing required query parameter: symbol (e.g. BTC-PERP)" },
        { status: 400 }
      );
    }

    const data = await getMarketData(symbol);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Market data error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch market data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
