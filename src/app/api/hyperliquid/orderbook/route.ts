import { NextRequest, NextResponse } from "next/server";
import { getOrderbook } from "@/lib/hyperliquid";

export const dynamic = "force-dynamic";

/**
 * GET /api/hyperliquid/orderbook?symbol=BTC-PERP
 *
 * Returns L2 orderbook with bids and asks.
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

    const data = await getOrderbook(symbol);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Orderbook error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch orderbook",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
