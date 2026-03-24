/**
 * Hyperliquid API Client — Server-side only
 *
 * Endpoints:
 *   - Info:     POST https://api.hyperliquid.xyz/info
 *   - Exchange: POST https://api.hyperliquid.xyz/exchange
 *
 * For exchange actions (placing/cancelling orders), the agent wallet must sign
 * the action using EIP-712 typed data. We use viem for signing.
 */

const INFO_URL = "https://api.hyperliquid.xyz/info";
const EXCHANGE_URL = "https://api.hyperliquid.xyz/exchange";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketData {
  symbol: string;
  markPrice: number;
  midPrice: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
}

export interface OrderbookLevel {
  price: number;
  size: number;
}

export interface Orderbook {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number | null;
  marginUsed: number;
}

export interface AccountBalance {
  totalEquity: number;
  availableBalance: number;
  marginUsed: number;
  unrealizedPnl: number;
  accountValue: number;
}

export interface OrderResult {
  status: "ok" | "error";
  orderId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function infoRequest(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hyperliquid info API error (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Convert our user-facing symbol (e.g. "BTC-PERP") to the Hyperliquid internal
 * coin name (e.g. "BTC"). Hyperliquid perpetuals use the base coin name.
 */
function symbolToCoin(symbol: string): string {
  return symbol.replace(/-PERP$/i, "").replace(/\/.*$/, "").toUpperCase();
}

/**
 * Find the asset index for a given coin in Hyperliquid's metadata.
 */
async function getAssetIndex(coin: string): Promise<number> {
  const meta = (await infoRequest({ type: "meta" })) as {
    universe: { name: string }[];
  };
  const idx = meta.universe.findIndex(
    (a) => a.name.toUpperCase() === coin.toUpperCase()
  );
  if (idx === -1) throw new Error(`Unknown Hyperliquid asset: ${coin}`);
  return idx;
}

// ---------------------------------------------------------------------------
// Public API — Market Data (no auth required)
// ---------------------------------------------------------------------------

/**
 * Get market data for a single symbol.
 */
export async function getMarketData(symbol: string): Promise<MarketData> {
  const coin = symbolToCoin(symbol);

  // Fetch metadata and all-mids in parallel
  const [meta, allMids, fundingData] = await Promise.all([
    infoRequest({ type: "meta" }) as Promise<{
      universe: { name: string; szDecimals: number }[];
    }>,
    infoRequest({ type: "allMids" }) as Promise<Record<string, string>>,
    infoRequest({ type: "metaAndAssetCtxs" }) as Promise<
      [
        { universe: { name: string }[] },
        {
          funding: string;
          openInterest: string;
          prevDayPx: string;
          dayNtlVlm: string;
          markPx: string;
        }[],
      ]
    >,
  ]);

  const assetIdx = meta.universe.findIndex(
    (a) => a.name.toUpperCase() === coin
  );
  if (assetIdx === -1) throw new Error(`Unknown symbol: ${symbol}`);

  const ctx = fundingData[1][assetIdx];
  const midPrice = parseFloat(allMids[coin] || "0");
  const markPrice = parseFloat(ctx.markPx || "0");
  const prevDayPx = parseFloat(ctx.prevDayPx || "0");
  const change24h = prevDayPx > 0 ? ((markPrice - prevDayPx) / prevDayPx) * 100 : 0;

  return {
    symbol,
    markPrice,
    midPrice,
    change24h,
    volume24h: parseFloat(ctx.dayNtlVlm || "0"),
    fundingRate: parseFloat(ctx.funding || "0"),
    openInterest: parseFloat(ctx.openInterest || "0"),
  };
}

/**
 * Get the orderbook (L2) for a symbol.
 */
export async function getOrderbook(symbol: string): Promise<Orderbook> {
  const coin = symbolToCoin(symbol);

  const data = (await infoRequest({
    type: "l2Book",
    coin,
  })) as {
    levels: [{ px: string; sz: string; n: number }[], { px: string; sz: string; n: number }[]];
  };

  return {
    symbol,
    bids: data.levels[0].map((l) => ({
      price: parseFloat(l.px),
      size: parseFloat(l.sz),
    })),
    asks: data.levels[1].map((l) => ({
      price: parseFloat(l.px),
      size: parseFloat(l.sz),
    })),
    timestamp: Date.now(),
  };
}

/**
 * Get OHLCV candle data for a symbol.
 */
export async function getCandles(
  symbol: string,
  interval: string,
  startTime?: number,
  endTime?: number,
  limit = 200
): Promise<Candle[]> {
  const coin = symbolToCoin(symbol);

  const now = Date.now();
  const intervalMs: Record<string, number> = {
    "1m": 60_000,
    "5m": 300_000,
    "15m": 900_000,
    "1h": 3_600_000,
    "4h": 14_400_000,
    "1d": 86_400_000,
  };

  const ms = intervalMs[interval] || 3_600_000;
  const start = startTime || now - ms * limit;
  const end = endTime || now;

  const data = (await infoRequest({
    type: "candleSnapshot",
    req: { coin, interval, startTime: start, endTime: end },
  })) as {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
  }[];

  return data.slice(-limit).map((c) => ({
    time: c.t,
    open: parseFloat(c.o),
    high: parseFloat(c.h),
    low: parseFloat(c.l),
    close: parseFloat(c.c),
    volume: parseFloat(c.v),
  }));
}

// ---------------------------------------------------------------------------
// Public API — User Data (requires wallet address)
// ---------------------------------------------------------------------------

/**
 * Get open positions for a wallet address.
 */
export async function getUserPositions(
  walletAddress: string
): Promise<Position[]> {
  const data = (await infoRequest({
    type: "clearinghouseState",
    user: walletAddress,
  })) as {
    assetPositions: {
      position: {
        coin: string;
        szi: string;
        entryPx: string;
        positionValue: string;
        unrealizedPnl: string;
        leverage: { type: string; value: number };
        liquidationPx: string | null;
        marginUsed: string;
      };
    }[];
  };

  return data.assetPositions
    .filter((ap) => parseFloat(ap.position.szi) !== 0)
    .map((ap) => {
      const p = ap.position;
      const size = parseFloat(p.szi);
      return {
        symbol: `${p.coin}-PERP`,
        side: size > 0 ? ("long" as const) : ("short" as const),
        size: Math.abs(size),
        entryPrice: parseFloat(p.entryPx),
        markPrice: parseFloat(p.positionValue) / Math.abs(size) || 0,
        unrealizedPnl: parseFloat(p.unrealizedPnl),
        leverage: p.leverage?.value ?? 1,
        liquidationPrice: p.liquidationPx
          ? parseFloat(p.liquidationPx)
          : null,
        marginUsed: parseFloat(p.marginUsed),
      };
    });
}

/**
 * Get account balance / equity for a wallet address.
 */
export async function getUserBalance(
  walletAddress: string
): Promise<AccountBalance> {
  const data = (await infoRequest({
    type: "clearinghouseState",
    user: walletAddress,
  })) as {
    marginSummary: {
      accountValue: string;
      totalNtlPos: string;
      totalRawUsd: string;
      totalMarginUsed: string;
    };
    crossMarginSummary: {
      accountValue: string;
      totalNtlPos: string;
      totalRawUsd: string;
      totalMarginUsed: string;
    };
  };

  const margin = data.marginSummary || data.crossMarginSummary;
  const accountValue = parseFloat(margin.accountValue || "0");
  const marginUsed = parseFloat(margin.totalMarginUsed || "0");

  return {
    totalEquity: accountValue,
    availableBalance: accountValue - marginUsed,
    marginUsed,
    unrealizedPnl: accountValue - parseFloat(margin.totalRawUsd || "0"),
    accountValue,
  };
}

// ---------------------------------------------------------------------------
// Public API — Trading Actions (requires agent wallet private key)
// ---------------------------------------------------------------------------

/**
 * Place an order on Hyperliquid using an agent wallet.
 *
 * The agent wallet signs the order action using EIP-712 typed data.
 * This requires viem for signing.
 */
export async function placeOrder(params: {
  agentPrivateKey: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  price?: number;
  orderType: "market" | "limit";
  leverage?: number;
  reduceOnly?: boolean;
}): Promise<OrderResult> {
  try {
    // Dynamic import of viem to keep it server-side only
    const { privateKeyToAccount } = await import("viem/accounts");
    const { createWalletClient, http } = await import("viem");
    const { arbitrum } = await import("viem/chains");

    const coin = symbolToCoin(params.symbol);
    const assetIndex = await getAssetIndex(coin);

    // Create account from private key
    const account = privateKeyToAccount(
      params.agentPrivateKey.startsWith("0x")
        ? (params.agentPrivateKey as `0x${string}`)
        : (`0x${params.agentPrivateKey}` as `0x${string}`)
    );

    const walletClient = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(),
    });

    // Determine if buy or sell based on side
    const isBuy = params.side === "long";
    const orderType = params.orderType === "market"
      ? { limit: { tif: "Ioc" as const } } // market orders use IOC limit
      : { limit: { tif: "Gtc" as const } };

    // For market orders, use a slippage price (0.5% above/below mid)
    let price = params.price;
    if (params.orderType === "market" && !price) {
      const market = await getMarketData(params.symbol);
      price = isBuy
        ? market.midPrice * 1.005 // 0.5% slippage for buys
        : market.midPrice * 0.995; // 0.5% slippage for sells
    }

    if (!price) throw new Error("Price is required for limit orders");

    // Round price to appropriate precision
    const roundedPrice = parseFloat(price.toPrecision(5));

    // Build the order action
    const timestamp = Date.now();
    const action = {
      type: "order" as const,
      orders: [
        {
          a: assetIndex,
          b: isBuy,
          p: roundedPrice.toString(),
          s: params.size.toString(),
          r: params.reduceOnly ?? false,
          t: orderType,
        },
      ],
      grouping: "na" as const,
    };

    // EIP-712 domain and types for Hyperliquid
    const domain = {
      name: "Exchange" as const,
      version: "1" as const,
      chainId: 1337,
      verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    };

    const types = {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" },
      ],
    } as const;

    // Create the connection ID hash
    const { keccak256, encodePacked } = await import("viem");
    const connectionId = keccak256(
      encodePacked(
        ["string", "uint64"],
        ["a", BigInt(timestamp)]
      )
    );

    const signature = await walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: "Agent",
      message: {
        source: "a",
        connectionId,
      },
    });

    // Send the exchange request
    const res = await fetch(EXCHANGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        nonce: timestamp,
        signature,
        vaultAddress: null,
      }),
    });

    const result = await res.json();

    if (!res.ok || result.status === "err") {
      return {
        status: "error",
        error: result.response || result.message || "Order placement failed",
      };
    }

    // Extract order ID from response
    const orderId =
      result.response?.data?.statuses?.[0]?.resting?.oid ||
      result.response?.data?.statuses?.[0]?.filled?.oid ||
      `hl_${timestamp}`;

    return {
      status: "ok",
      orderId: String(orderId),
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error placing order",
    };
  }
}

/**
 * Cancel an order on Hyperliquid.
 */
export async function cancelOrder(params: {
  agentPrivateKey: string;
  symbol: string;
  orderId: string;
}): Promise<OrderResult> {
  try {
    const { privateKeyToAccount } = await import("viem/accounts");
    const { createWalletClient, http, keccak256, encodePacked } = await import("viem");
    const { arbitrum } = await import("viem/chains");

    const coin = symbolToCoin(params.symbol);
    const assetIndex = await getAssetIndex(coin);

    const account = privateKeyToAccount(
      params.agentPrivateKey.startsWith("0x")
        ? (params.agentPrivateKey as `0x${string}`)
        : (`0x${params.agentPrivateKey}` as `0x${string}`)
    );

    const walletClient = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(),
    });

    const timestamp = Date.now();
    const action = {
      type: "cancel" as const,
      cancels: [{ a: assetIndex, o: parseInt(params.orderId) }],
    };

    const domain = {
      name: "Exchange" as const,
      version: "1" as const,
      chainId: 1337,
      verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    };

    const types = {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" },
      ],
    } as const;

    const connectionId = keccak256(
      encodePacked(
        ["string", "uint64"],
        ["a", BigInt(timestamp)]
      )
    );

    const signature = await walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: "Agent",
      message: {
        source: "a",
        connectionId,
      },
    });

    const res = await fetch(EXCHANGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        nonce: timestamp,
        signature,
        vaultAddress: null,
      }),
    });

    const result = await res.json();

    if (!res.ok || result.status === "err") {
      return {
        status: "error",
        error: result.response || "Cancel failed",
      };
    }

    return { status: "ok", orderId: params.orderId };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error cancelling order",
    };
  }
}
