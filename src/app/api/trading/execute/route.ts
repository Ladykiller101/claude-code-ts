import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = join(process.cwd(), "data");
const SECRETS_PATH = join(DATA_DIR, ".broker-secrets.json");
const CONNECTIONS_PATH = join(DATA_DIR, "broker-connections.json");

function readSecrets(): Record<string, Record<string, string>> {
  if (!existsSync(SECRETS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SECRETS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function readConnections(): Record<string, { connected: boolean }> {
  if (!existsSync(CONNECTIONS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONNECTIONS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

// Map broker IDs to ccxt exchange class names
const CCXT_MAP: Record<string, string> = {
  binance: "binance",
  coinbase: "coinbase",
  kraken: "kraken",
  bybit: "bybit",
  alpaca: "alpaca",
};

// ---------------------------------------------------------------------------
// POST /api/trading/execute — execute a trade on a connected broker
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brokerId,
      symbol,
      side,
      quantity,
      orderType = "market",
      limitPrice,
      simulate = false,
    } = body as {
      brokerId: string;
      symbol: string;
      side: "buy" | "sell";
      quantity: number;
      orderType?: "market" | "limit";
      limitPrice?: number;
      simulate?: boolean;
    };

    // Validate required fields
    if (!brokerId || !symbol || !side || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: brokerId, symbol, side, quantity",
        },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Quantity must be greater than 0" },
        { status: 400 },
      );
    }

    if (orderType === "limit" && !limitPrice) {
      return NextResponse.json(
        { success: false, error: "limitPrice is required for limit orders" },
        { status: 400 },
      );
    }

    // ── Simulate mode ──────────────────────────────────────────
    if (simulate) {
      const simulatedPrice =
        orderType === "limit" && limitPrice
          ? limitPrice
          : generateMockPrice(symbol);
      const total = simulatedPrice * quantity;
      const fee = total * 0.001; // 0.1% fee

      return NextResponse.json({
        success: true,
        simulated: true,
        order: {
          id: `sim_${Date.now().toString(36)}`,
          brokerId,
          symbol,
          side,
          type: orderType,
          quantity,
          price: simulatedPrice,
          total,
          fee,
          status: orderType === "market" ? "filled" : "open",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ── Live mode — verify broker connection ───────────────────
    const connections = readConnections();
    const conn = connections[brokerId];
    if (!conn?.connected) {
      return NextResponse.json(
        {
          success: false,
          error: `Broker "${brokerId}" is not connected. Go to Settings to connect it.`,
        },
        { status: 400 },
      );
    }

    const secrets = readSecrets();
    const creds = secrets[brokerId];
    if (!creds?.api_key || !creds?.api_secret) {
      return NextResponse.json(
        {
          success: false,
          error: `No API credentials found for "${brokerId}". Re-enter them in Settings.`,
        },
        { status: 400 },
      );
    }

    // ── Call ccxt via dynamic import ───────────────────────────
    // Note: ccxt is a Node.js package. If it's not installed in the
    // Next.js project, this will fall back to a REST-based approach.
    const ccxtId = CCXT_MAP[brokerId];
    if (!ccxtId) {
      return NextResponse.json(
        { success: false, error: `Unsupported broker: ${brokerId}` },
        { status: 400 },
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ccxt = require("ccxt");
      const ExchangeClass = ccxt[ccxtId];
      if (!ExchangeClass) {
        return NextResponse.json(
          { success: false, error: `ccxt does not support exchange: ${ccxtId}` },
          { status: 400 },
        );
      }

      const config: Record<string, unknown> = {
        apiKey: creds.api_key,
        secret: creds.api_secret,
        enableRateLimit: true,
        timeout: 30000,
      };
      // Coinbase Pro legacy passphrase (optional for Advanced Trade)
      if (creds.passphrase) {
        config.password = creds.passphrase;
      }

      const exchange = new ExchangeClass(config);

      // Place the order
      const order = await exchange.createOrder(
        symbol,
        orderType,
        side,
        quantity,
        orderType === "limit" ? limitPrice : undefined,
      );

      return NextResponse.json({
        success: true,
        simulated: false,
        order: {
          id: order.id,
          brokerId,
          symbol: order.symbol,
          side: order.side,
          type: order.type,
          quantity: order.amount,
          price: order.price ?? order.average,
          total: (order.price ?? order.average ?? 0) * order.amount,
          fee: order.fee?.cost ?? 0,
          status: order.status,
          timestamp: order.datetime ?? new Date().toISOString(),
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : JSON.stringify(err);
      console.error(`Live trade failed: ${brokerId}`, message);
      return NextResponse.json(
        { success: false, error: `Live trade failed: ${brokerId}\n${message}` },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Execute trade error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute trade" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Mock price generator for simulate mode
// ---------------------------------------------------------------------------
function generateMockPrice(symbol: string): number {
  const base: Record<string, number> = {
    "BTC/USD": 87000,
    "BTC/USDT": 87000,
    "ETH/USD": 3200,
    "ETH/USDT": 3200,
    "SOL/USD": 145,
    "SOL/USDT": 145,
    "DOGE/USD": 0.18,
    "DOGE/USDT": 0.18,
    "ADA/USD": 0.75,
    "ADA/USDT": 0.75,
    "AVAX/USD": 38,
    "AVAX/USDT": 38,
    "DOT/USD": 7.5,
    "DOT/USDT": 7.5,
    "XRP/USDT": 0.62,
    "LINK/USD": 16,
    "BNB/USDT": 620,
  };
  const p = base[symbol] ?? 100;
  // Add ±0.5% random spread
  return p * (1 + (Math.random() - 0.5) * 0.01);
}
