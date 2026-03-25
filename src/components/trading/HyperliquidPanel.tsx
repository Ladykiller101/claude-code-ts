"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// ─── Types ────────────────────────────────────────────────────

interface Position {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number | null;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  marginUsed?: number;
}

interface RecentTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  time: string;
}

interface MarketInfo {
  markPrice: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
}

interface WalletInfo {
  walletAddress: string;
  label: string;
  isActive: boolean;
}

interface Toast {
  type: "success" | "error";
  message: string;
}

// ─── Constants ────────────────────────────────────────────────

const SYMBOLS = [
  "BTC-PERP",
  "ETH-PERP",
  "SOL-PERP",
  "ARB-PERP",
  "DOGE-PERP",
  "AVAX-PERP",
  "LINK-PERP",
  "OP-PERP",
];

// ─── Mock fallback data ────────────────────────────────────────

const MOCK_POSITIONS: Position[] = [
  {
    symbol: "BTC-PERP",
    side: "long",
    size: 0.15,
    entryPrice: 66800,
    markPrice: 67520,
    liquidationPrice: 58400,
    leverage: 10,
    unrealizedPnl: 108.0,
    unrealizedPnlPct: 1.08,
  },
  {
    symbol: "ETH-PERP",
    side: "short",
    size: 2.0,
    entryPrice: 3520,
    markPrice: 3455,
    liquidationPrice: 4200,
    leverage: 5,
    unrealizedPnl: 130.0,
    unrealizedPnlPct: 1.85,
  },
];

const MOCK_TRADES: RecentTrade[] = [
  { id: "1", symbol: "BTC-PERP", side: "buy", price: 67480, size: 0.05, time: "14:32:05" },
  { id: "2", symbol: "ETH-PERP", side: "sell", price: 3452, size: 1.0, time: "14:28:12" },
  { id: "3", symbol: "SOL-PERP", side: "buy", price: 145.2, size: 20, time: "14:15:41" },
  { id: "4", symbol: "BTC-PERP", side: "buy", price: 67350, size: 0.1, time: "13:58:22" },
  { id: "5", symbol: "ETH-PERP", side: "sell", price: 3468, size: 0.5, time: "13:42:09" },
];

const MOCK_MARKET: MarketInfo = {
  markPrice: 67520,
  change24h: 1.24,
  volume24h: 2_450_000_000,
  fundingRate: 0.0001,
  openInterest: 850_000_000,
};

// ─── Utility ──────────────────────────────────────────────────

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function formatVolume(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Component ────────────────────────────────────────────────

interface HyperliquidPanelProps {
  onSymbolChange?: (symbol: string) => void;
}

export default function HyperliquidPanel({ onSymbolChange }: HyperliquidPanelProps) {
  const { user, isAuthenticated } = useAuth();

  // UI state
  const [symbol, setSymbol] = useState("BTC-PERP");
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [side, setSide] = useState<"long" | "short">("long");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [activeSection, setActiveSection] = useState<"positions" | "trades">("positions");

  // Data state
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [market, setMarket] = useState<MarketInfo | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [trades, setTrades] = useState<RecentTrade[]>(MOCK_TRADES);
  const [usingMockData, setUsingMockData] = useState(false);

  // Order submission state
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Toast helper ───
  const showToast = useCallback((type: "success" | "error", message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Fetch market data ───
  const fetchMarketData = useCallback(async () => {
    setMarketLoading(true);
    try {
      const res = await fetch(`/api/hyperliquid/market?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`Market API ${res.status}`);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error("Invalid market response");
      setMarket({
        markPrice: json.data.markPrice,
        change24h: json.data.change24h,
        volume24h: json.data.volume24h,
        fundingRate: json.data.fundingRate,
        openInterest: json.data.openInterest,
      });
      setUsingMockData(false);
    } catch (err) {
      console.warn("Failed to fetch market data, using mock:", err);
      setMarket(MOCK_MARKET);
      setUsingMockData(true);
    } finally {
      setMarketLoading(false);
    }
  }, [symbol]);

  // ─── Fetch wallet info ───
  const fetchWallet = useCallback(async () => {
    if (!isAuthenticated) {
      setWalletInfo(null);
      return;
    }
    setWalletLoading(true);
    try {
      const res = await fetch("/api/hyperliquid/wallet");
      if (res.status === 401) {
        setWalletInfo(null);
        return;
      }
      if (!res.ok) throw new Error(`Wallet API ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error("Invalid wallet response");

      const wallets = json.data?.wallets || [];
      const activeWallet = wallets.find((w: { is_active: boolean }) => w.is_active);
      if (activeWallet) {
        setWalletInfo({
          walletAddress: activeWallet.wallet_address,
          label: activeWallet.label,
          isActive: activeWallet.is_active,
        });
      } else {
        setWalletInfo(null);
      }
    } catch (err) {
      console.warn("Failed to fetch wallet info:", err);
      setWalletInfo(null);
    } finally {
      setWalletLoading(false);
    }
  }, [isAuthenticated]);

  // ─── Fetch positions ───
  const fetchPositions = useCallback(async () => {
    if (!isAuthenticated) {
      setPositions([]);
      return;
    }
    setPositionsLoading(true);
    try {
      const res = await fetch("/api/hyperliquid/positions");
      if (res.status === 401) {
        setPositions([]);
        return;
      }
      if (res.status === 404) {
        // NO_WALLET — no wallet connected
        setPositions([]);
        return;
      }
      if (!res.ok) throw new Error(`Positions API ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error("Invalid positions response");

      const apiPositions: Position[] = (json.data?.positions || []).map(
        (p: {
          symbol: string;
          side: "long" | "short";
          size: number;
          entryPrice: number;
          markPrice: number;
          liquidationPrice: number | null;
          leverage: number;
          unrealizedPnl: number;
          marginUsed: number;
        }) => {
          const pnlPct =
            p.entryPrice > 0
              ? ((p.markPrice - p.entryPrice) / p.entryPrice) *
                100 *
                (p.side === "long" ? 1 : -1)
              : 0;
          return {
            symbol: p.symbol,
            side: p.side,
            size: p.size,
            entryPrice: p.entryPrice,
            markPrice: p.markPrice,
            liquidationPrice: p.liquidationPrice,
            leverage: p.leverage,
            unrealizedPnl: p.unrealizedPnl,
            unrealizedPnlPct: pnlPct,
            marginUsed: p.marginUsed,
          };
        }
      );
      setPositions(apiPositions);
      setUsingMockData(false);
    } catch (err) {
      console.warn("Failed to fetch positions, using mock:", err);
      setPositions(MOCK_POSITIONS);
      setUsingMockData(true);
    } finally {
      setPositionsLoading(false);
    }
  }, [isAuthenticated]);

  // ─── Initial fetch + polling ───

  // Market data: fetch on mount and every 10 seconds
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10_000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Wallet: fetch on mount and when auth changes
  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Positions: fetch on mount and when auth changes
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // ─── Symbol change handler ───
  const handleSymbolChange = (sym: string) => {
    setSymbol(sym);
    setShowSymbolPicker(false);
    onSymbolChange?.(sym);
  };

  // ─── Wallet connect ───
  const handleConnect = () => {
    // Navigate to settings page for wallet connection
    window.location.href = "/trading/settings?tab=wallet";
  };

  const handleDisconnect = () => {
    // Navigate to settings to manage wallet
    window.location.href = "/trading/settings?tab=wallet";
  };

  // ─── Order submission ───
  const handleSubmitOrder = async () => {
    if (!quantity) return;
    if (!isAuthenticated) {
      showToast("error", "Please log in to place orders");
      return;
    }
    if (!walletInfo) {
      showToast("error", "Connect a wallet first to place orders");
      return;
    }

    setOrderSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        symbol,
        side,
        size: parseFloat(quantity),
        orderType,
        leverage,
      };
      if (orderType === "limit" && limitPrice) {
        body.price = parseFloat(limitPrice);
      }

      const res = await fetch("/api/hyperliquid/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const errorMsg = json.error || "Order placement failed";
        showToast("error", errorMsg);
        return;
      }

      showToast(
        "success",
        `${orderType === "market" ? "Market" : "Limit"} ${side} order filled: ${quantity} ${symbol}`
      );
      setQuantity("");
      setLimitPrice("");

      // Refresh positions after successful order
      fetchPositions();
    } catch (err) {
      console.error("Order submission error:", err);
      showToast("error", err instanceof Error ? err.message : "Failed to submit order");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const leverageMarks = [1, 5, 10, 20, 50];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card-glass rounded-2xl flex flex-col h-full overflow-hidden relative"
    >
      {/* ─── Toast notification ─────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-2 left-2 right-2 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              toast.type === "success"
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/20 border border-red-500/30 text-red-400"
            }`}
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span className="truncate">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header: Wallet + Symbol ───────────────────────── */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
        {/* Symbol picker */}
        <div className="relative">
          <button
            onClick={() => setShowSymbolPicker(!showSymbolPicker)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all"
          >
            <span className="text-sm font-semibold text-white">{symbol}</span>
            <ChevronDown
              className={`w-3 h-3 text-zinc-500 transition-transform ${showSymbolPicker ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {showSymbolPicker && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute top-full mt-1 left-0 w-44 rounded-xl overflow-hidden z-50"
                style={{
                  background: "rgba(15,15,20,0.98)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}
              >
                {SYMBOLS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleSymbolChange(sym)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.04] transition-colors ${
                      sym === symbol ? "text-emerald-400 bg-emerald-400/5" : "text-zinc-300"
                    }`}
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {sym}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wallet button */}
        {walletLoading ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
            <span className="text-xs text-zinc-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              Loading...
            </span>
          </div>
        ) : walletInfo ? (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span
              className="text-xs"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {truncateAddress(walletInfo.walletAddress)}
            </span>
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-zinc-300"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span
              className="text-xs"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              Connect Wallet
            </span>
          </button>
        )}
      </div>

      {/* ─── Market Data Bar ─────────────────────────────────── */}
      {market && (
        <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-4 text-[10px]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Price</span>
            <span className="text-white font-semibold">${formatPrice(market.markPrice)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">24h</span>
            <span className={market.change24h >= 0 ? "text-emerald-400" : "text-red-400"}>
              {market.change24h >= 0 ? "+" : ""}{market.change24h.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Vol</span>
            <span className="text-zinc-300">{formatVolume(market.volume24h)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">Fund</span>
            <span className={market.fundingRate >= 0 ? "text-emerald-400" : "text-red-400"}>
              {(market.fundingRate * 100).toFixed(4)}%
            </span>
          </div>
          {usingMockData && (
            <span className="text-[9px] text-amber-500/70 px-1 py-0.5 rounded bg-amber-500/10">
              Mock
            </span>
          )}
          {marketLoading && (
            <Loader2 className="w-2.5 h-2.5 text-zinc-500 animate-spin" />
          )}
        </div>
      )}

      {/* ─── Order Form ────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-4 border-b border-white/[0.06]">
        {/* Order type toggle */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
          {(["market", "limit"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all tracking-wider uppercase ${
                orderType === type
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Side toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => setSide("long")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              side === "long"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300"
            }`}
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            LONG
          </button>
          <button
            onClick={() => setSide("short")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              side === "short"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300"
            }`}
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            SHORT
          </button>
        </div>

        {/* Quantity */}
        <div>
          <label
            className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            Quantity ({symbol.split("-")[0]})
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          />
        </div>

        {/* Limit price (shown only for limit orders) */}
        <AnimatePresence>
          {orderType === "limit" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label
                className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Limit Price (USD)
              </label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leverage slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="text-[10px] text-zinc-500 uppercase tracking-wider"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              Leverage
            </label>
            <span
              className="text-xs font-bold text-emerald-400"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {leverage}x
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${(leverage / 50) * 100}%, rgba(255,255,255,0.06) ${(leverage / 50) * 100}%, rgba(255,255,255,0.06) 100%)`,
            }}
          />
          <div className="flex justify-between mt-1.5">
            {leverageMarks.map((mark) => (
              <button
                key={mark}
                onClick={() => setLeverage(mark)}
                className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${
                  leverage === mark
                    ? "text-emerald-400 bg-emerald-400/10"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {mark}x
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmitOrder}
          disabled={!quantity || (!walletInfo && isAuthenticated) || !isAuthenticated || orderSubmitting}
          className={`w-full py-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed ${
            side === "long"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-red-600 hover:bg-red-500 text-white"
          }`}
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {orderSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              {side === "long" ? "Buy / Long" : "Sell / Short"} {symbol}
            </>
          )}
        </button>

        {!isAuthenticated && (
          <p className="text-[10px] text-zinc-600 text-center flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Log in to place orders
          </p>
        )}
        {isAuthenticated && !walletInfo && !walletLoading && (
          <p className="text-[10px] text-zinc-600 text-center flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Connect wallet to place orders
          </p>
        )}
      </div>

      {/* ─── Positions / Trades toggle ─────────────────────── */}
      <div className="flex border-b border-white/[0.06]">
        {(["positions", "trades"] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-all ${
              activeSection === section
                ? "text-white border-b-2 border-emerald-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {section === "positions" ? "Open Positions" : "Recent Trades"}
          </button>
        ))}
      </div>

      {/* ─── Positions / Trades content ────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {activeSection === "positions" ? (
            <motion.div
              key="positions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-white/[0.04]"
            >
              {positionsLoading && positions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Loader2 className="w-5 h-5 text-zinc-500 animate-spin mx-auto mb-2" />
                  <span className="text-zinc-600 text-xs">Loading positions...</span>
                </div>
              ) : !isAuthenticated ? (
                <div className="px-4 py-8 text-center text-zinc-600 text-xs">
                  Log in to view positions
                </div>
              ) : !walletInfo && !walletLoading ? (
                <div className="px-4 py-8 text-center text-zinc-600 text-xs">
                  Connect wallet to view positions
                </div>
              ) : positions.length === 0 ? (
                <div className="px-4 py-8 text-center text-zinc-600 text-xs">
                  No open positions
                </div>
              ) : (
                positions.map((pos) => (
                  <PositionRow key={pos.symbol + pos.side} position={pos} />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="trades"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-white/[0.04]"
            >
              {trades.length === 0 ? (
                <div className="px-4 py-8 text-center text-zinc-600 text-xs">
                  No recent trades
                </div>
              ) : (
                trades.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function PositionRow({ position }: { position: Position }) {
  const isLong = position.side === "long";
  const isProfitable = position.unrealizedPnl >= 0;

  return (
    <div className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
              isLong
                ? "bg-emerald-400/10 text-emerald-400"
                : "bg-red-400/10 text-red-400"
            }`}
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {position.side.toUpperCase()} {position.leverage}x
          </span>
          <span
            className="text-xs font-medium text-white"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {position.symbol}
          </span>
        </div>
        <span
          className={`text-xs font-bold ${isProfitable ? "text-emerald-400" : "text-red-400"}`}
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {isProfitable ? "+" : ""}${position.unrealizedPnl.toFixed(2)}
          <span className="text-[10px] ml-1 opacity-60">
            ({isProfitable ? "+" : ""}{position.unrealizedPnlPct.toFixed(2)}%)
          </span>
        </span>
      </div>
      <div className="flex gap-4 text-[10px] text-zinc-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>
        <span>Size: {position.size}</span>
        <span>Entry: ${formatPrice(position.entryPrice)}</span>
        <span>Mark: ${formatPrice(position.markPrice)}</span>
        {position.liquidationPrice != null && (
          <span className="text-amber-500/70">Liq: ${formatPrice(position.liquidationPrice)}</span>
        )}
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: RecentTrade }) {
  const isBuy = trade.side === "buy";

  return (
    <div className="px-4 py-2.5 hover:bg-white/[0.02] transition-colors flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-1 h-4 rounded-full ${isBuy ? "bg-emerald-400" : "bg-red-400"}`} />
        <span
          className="text-[11px] text-white"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {trade.symbol}
        </span>
        <span
          className={`text-[10px] ${isBuy ? "text-emerald-400" : "text-red-400"}`}
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {trade.side.toUpperCase()}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-zinc-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>
        <span>${formatPrice(trade.price)}</span>
        <span>{trade.size}</span>
        <span className="flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {trade.time}
        </span>
      </div>
    </div>
  );
}
