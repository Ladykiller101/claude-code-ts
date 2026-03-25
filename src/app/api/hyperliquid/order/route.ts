import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { placeOrder, getMarketData } from "@/lib/hyperliquid";
import { decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

/**
 * POST /api/hyperliquid/order
 *
 * Place an order on Hyperliquid.
 * Requires authentication. Validates against user risk limits.
 *
 * Body: {
 *   symbol: string,       // e.g. "BTC-PERP"
 *   side: "long" | "short",
 *   size: number,          // quantity in base asset
 *   price?: number,        // required for limit orders
 *   orderType: "market" | "limit",
 *   leverage?: number      // optional, defaults to user config
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, side, size, price, orderType, leverage } = body as {
      symbol: string;
      side: "long" | "short";
      size: number;
      price?: number;
      orderType: "market" | "limit";
      leverage?: number;
    };

    // Validate required fields
    if (!symbol || !side || !size || !orderType) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, side, size, orderType" },
        { status: 400 }
      );
    }

    if (!["long", "short"].includes(side)) {
      return NextResponse.json(
        { error: 'side must be "long" or "short"' },
        { status: 400 }
      );
    }

    if (!["market", "limit"].includes(orderType)) {
      return NextResponse.json(
        { error: 'orderType must be "market" or "limit"' },
        { status: 400 }
      );
    }

    if (size <= 0) {
      return NextResponse.json(
        { error: "size must be greater than 0" },
        { status: 400 }
      );
    }

    if (orderType === "limit" && (!price || price <= 0)) {
      return NextResponse.json(
        { error: "price is required and must be > 0 for limit orders" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get user's active wallet with encrypted agent key
    // Use admin client to bypass RLS — we already verified the user via getAuthUser()
    const { data: wallet, error: walletError } = await admin
      .from("user_wallets")
      .select("wallet_address, agent_wallet_encrypted")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: "No active wallet found. Connect a wallet first.", code: "NO_WALLET" },
        { status: 404 }
      );
    }

    if (!wallet.agent_wallet_encrypted) {
      return NextResponse.json(
        {
          error: "No agent wallet key configured. Re-connect your wallet with an agent private key.",
          code: "NO_AGENT_KEY",
        },
        { status: 400 }
      );
    }

    // Get user trading config for risk limits
    const { data: config } = await admin
      .from("user_trading_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const maxLeverage = config?.max_leverage ?? 10;
    const maxPositionSizeUsd = config?.max_position_size_usd ?? 5000;
    const effectiveLeverage = leverage ?? config?.default_leverage ?? 1;

    // Validate leverage
    if (effectiveLeverage > maxLeverage) {
      return NextResponse.json(
        {
          error: `Leverage ${effectiveLeverage}x exceeds your max allowed leverage of ${maxLeverage}x`,
          code: "LEVERAGE_EXCEEDED",
        },
        { status: 400 }
      );
    }

    // Validate position size against risk limits
    const marketData = await getMarketData(symbol);
    const positionValueUsd = size * marketData.markPrice;

    if (positionValueUsd > maxPositionSizeUsd) {
      return NextResponse.json(
        {
          error: `Position value $${positionValueUsd.toFixed(2)} exceeds your max position size of $${maxPositionSizeUsd}`,
          code: "POSITION_SIZE_EXCEEDED",
        },
        { status: 400 }
      );
    }

    // Enforce daily risk limit
    const riskLimitDailyUsd = config?.risk_limit_daily_usd ?? 1000;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: todayTrades, error: todayTradesError } = await admin
      .from("trade_history")
      .select("quantity, filled_price, leverage")
      .eq("user_id", user.id)
      .gte("created_at", twentyFourHoursAgo);

    if (todayTradesError) {
      console.error("Failed to query today's trades:", todayTradesError);
      return NextResponse.json(
        { error: "Failed to check daily risk limit. Please try again." },
        { status: 500 }
      );
    }

    const todayVolume = (todayTrades || []).reduce(
      (sum, t) => sum + Math.abs((t.quantity || 0) * (t.filled_price || 0) * (t.leverage || 1)),
      0
    );

    const orderNotional = size * marketData.markPrice * effectiveLeverage;

    if (todayVolume + orderNotional > riskLimitDailyUsd) {
      return NextResponse.json(
        {
          error: `Daily risk limit exceeded. Today's volume: $${todayVolume.toFixed(2)}, ` +
            `Order notional: $${orderNotional.toFixed(2)}, Limit: $${riskLimitDailyUsd}`,
          code: "DAILY_RISK_LIMIT_EXCEEDED",
        },
        { status: 422 }
      );
    }

    // Decrypt agent wallet key
    let agentPrivateKey: string;
    try {
      agentPrivateKey = decrypt(wallet.agent_wallet_encrypted);
    } catch {
      return NextResponse.json(
        { error: "Failed to decrypt agent wallet key. Please re-connect your wallet." },
        { status: 500 }
      );
    }

    // Record the trade as pending
    const { data: tradeRecord, error: insertError } = await admin
      .from("trade_history")
      .insert({
        user_id: user.id,
        symbol,
        side,
        order_type: orderType,
        quantity: size,
        price: price ?? marketData.markPrice,
        leverage: effectiveLeverage,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to record trade:", insertError);
    }

    // Place the order on Hyperliquid
    const result = await placeOrder({
      agentPrivateKey,
      symbol,
      side,
      size,
      price,
      orderType,
      leverage: effectiveLeverage,
    });

    // Update trade record with result
    if (tradeRecord?.id) {
      if (result.status === "ok") {
        await admin
          .from("trade_history")
          .update({
            status: "filled",
            hyperliquid_order_id: result.orderId,
            filled_price: price ?? marketData.markPrice,
          })
          .eq("id", tradeRecord.id);
      } else {
        await admin
          .from("trade_history")
          .update({
            status: "failed",
          })
          .eq("id", tradeRecord.id);
      }
    }

    if (result.status === "error") {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Order placement failed on Hyperliquid",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.orderId,
        symbol,
        side,
        size,
        price: price ?? marketData.markPrice,
        orderType,
        leverage: effectiveLeverage,
        status: "filled",
        tradeId: tradeRecord?.id,
      },
    });
  } catch (error) {
    console.error("Order error:", error);
    return NextResponse.json(
      {
        error: "Failed to place order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
