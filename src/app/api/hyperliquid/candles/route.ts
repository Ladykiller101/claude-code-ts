import { NextRequest, NextResponse } from "next/server";
import { getCandles } from "@/lib/hyperliquid";

export const dynamic = "force-dynamic";

/**
 * GET /api/hyperliquid/candles?symbol=BTC-PERP&interval=1h&limit=200
 *
 * Returns OHLCV candle data.
 * No authentication required (public data).
 *
 * Supported intervals: 1m, 5m, 15m, 1h, 4h, 1d
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const symbol = params.get("symbol");
    const interval = params.get("interval") || "1h";
    const limit = Math.min(parseInt(params.get("limit") || "200", 10), 1000);
    const startTime = params.get("startTime")
      ? parseInt(params.get("startTime")!, 10)
      : undefined;

    if (!symbol) {
      return NextResponse.json(
        { error: "Missing required query parameter: symbol (e.g. BTC-PERP)" },
        { status: 400 }
      );
    }

    const validIntervals = ["1m", "5m", "15m", "1h", "4h", "1d"];
    if (!validIntervals.includes(interval)) {
      return NextResponse.json(
        {
          error: `Invalid interval: ${interval}. Valid: ${validIntervals.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const data = await getCandles(symbol, interval, startTime, undefined, limit);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Candles error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch candle data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
