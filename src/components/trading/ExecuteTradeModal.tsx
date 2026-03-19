"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

interface Broker {
  id: string;
  name: string;
  connected: boolean;
  supportedAssets: string[];
}

interface OrderResult {
  id: string;
  brokerId: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  price: number;
  total: number;
  fee: number;
  status: string;
  timestamp: string;
}

interface ExecuteTradeModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────

export default function ExecuteTradeModal({
  open,
  onClose,
}: ExecuteTradeModalProps) {
  const [mode, setMode] = useState<"simulate" | "live">("simulate");
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<string>("");
  const [symbol, setSymbol] = useState("BTC/USD");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("0.0001");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch connected brokers
  useEffect(() => {
    if (!open) return;
    fetch("/api/trading/brokers")
      .then((r) => r.json())
      .then((d) => {
        const connected = (d.brokers ?? []).filter(
          (b: Broker) => b.connected,
        );
        setBrokers(connected);
        if (connected.length > 0 && !selectedBroker) {
          setSelectedBroker(connected[0].id);
        }
      })
      .catch(() => {});
  }, [open, selectedBroker]);

  // Reset state when closing
  const handleClose = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
    onClose();
  }, [onClose]);

  // Available symbols for selected broker
  const currentBroker = brokers.find((b) => b.id === selectedBroker);
  const assets = currentBroker?.supportedAssets ?? [
    "BTC/USD",
    "ETH/USD",
    "SOL/USD",
  ];

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        brokerId: selectedBroker,
        symbol,
        side: direction,
        quantity: parseFloat(quantity),
        orderType,
        simulate: mode === "simulate",
      };
      if (orderType === "limit" && limitPrice) {
        payload.limitPrice = parseFloat(limitPrice);
      }

      const res = await fetch("/api/trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Trade execution failed");
      } else {
        setResult(data.order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const directionLabel = direction === "buy" ? "Long" : "Short";
  const buttonLabel = `Buy / ${directionLabel} ${symbol}`;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="card-glass rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* ─── Header ─────────────────────────────────────── */}
          <div className="flex items-center justify-between p-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Execute Trade
                </h3>
                <p
                  className="text-[11px] uppercase tracking-wider"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  <span
                    className={
                      mode === "live" ? "text-emerald-400" : "text-zinc-500"
                    }
                  >
                    {mode === "live" ? "LIVE TRADING" : "PAPER TRADING"}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* ─── Mode Toggle ─────────────────────────────── */}
            <div className="flex gap-2 bg-white/[0.03] rounded-xl p-1">
              <button
                onClick={() => setMode("simulate")}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all tracking-wider ${
                  mode === "simulate"
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                SIMULATE
              </button>
              <button
                onClick={() => setMode("live")}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all tracking-wider ${
                  mode === "live"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                LIVE MODE
              </button>
            </div>

            {/* ─── Live warning ─────────────────────────────── */}
            {mode === "live" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  LIVE TRADING — Real orders will be placed through your
                  connected broker
                </p>
              </motion.div>
            )}

            {/* ─── Broker ──────────────────────────────────── */}
            <div>
              <label
                className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Broker
              </label>
              {brokers.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No brokers connected.{" "}
                  <a
                    href="/trading/settings"
                    className="text-emerald-400 hover:underline"
                  >
                    Connect one in Settings
                  </a>
                </p>
              ) : (
                <select
                  value={selectedBroker}
                  onChange={(e) => {
                    setSelectedBroker(e.target.value);
                    // Reset symbol when switching broker
                    const broker = brokers.find(
                      (b) => b.id === e.target.value,
                    );
                    if (
                      broker &&
                      !broker.supportedAssets.includes(symbol)
                    ) {
                      setSymbol(broker.supportedAssets[0] ?? "BTC/USD");
                    }
                  }}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/40 transition-colors appearance-none"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#0f0f14]">
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ─── Symbol ──────────────────────────────────── */}
            <div>
              <label
                className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Symbol
              </label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/40 transition-colors appearance-none"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {assets.map((a) => (
                  <option key={a} value={a} className="bg-[#0f0f14]">
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* ─── Direction ───────────────────────────────── */}
            <div>
              <label
                className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Direction
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDirection("buy")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    direction === "buy"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300"
                  }`}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  LONG
                </button>
                <button
                  onClick={() => setDirection("sell")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    direction === "sell"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300"
                  }`}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  SHORT
                </button>
              </div>
            </div>

            {/* ─── Quantity ─────────────────────────────────── */}
            <div>
              <label
                className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Quantity
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/40 transition-colors"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              />
            </div>

            {/* ─── Order Type ──────────────────────────────── */}
            <div>
              <label
                className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Order Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType("market")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    orderType === "market"
                      ? "bg-white/[0.08] text-white border border-white/[0.12]"
                      : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300"
                  }`}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  MARKET
                </button>
                <button
                  onClick={() => setOrderType("limit")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    orderType === "limit"
                      ? "bg-white/[0.08] text-white border border-white/[0.12]"
                      : "bg-white/[0.03] text-zinc-500 border border-white/[0.06] hover:text-zinc-300"
                  }`}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  LIMIT
                </button>
              </div>
            </div>

            {/* ─── Limit Price (conditional) ───────────────── */}
            {orderType === "limit" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <label
                  className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  Limit Price
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-colors"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                />
              </motion.div>
            )}

            {/* ─── Error display ───────────────────────────── */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-red-300/90 leading-relaxed break-all">
                  {error}
                </p>
              </motion.div>
            )}

            {/* ─── Success display ─────────────────────────── */}
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">
                    {result.status === "filled"
                      ? "Order Filled"
                      : `Order ${result.status}`}
                  </span>
                </div>
                <div
                  className="grid grid-cols-2 gap-1 text-[10px]"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  <span className="text-zinc-500">ID</span>
                  <span className="text-zinc-300 truncate">{result.id}</span>
                  <span className="text-zinc-500">Price</span>
                  <span className="text-zinc-300">
                    ${result.price?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-zinc-500">Total</span>
                  <span className="text-zinc-300">
                    ${result.total?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-zinc-500">Fee</span>
                  <span className="text-zinc-300">
                    ${result.fee?.toFixed(4)}
                  </span>
                </div>
              </motion.div>
            )}

            {/* ─── Execute Button ──────────────────────────── */}
            <button
              onClick={handleExecute}
              disabled={loading || !selectedBroker || !quantity}
              className={`w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                loading || !selectedBroker
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : direction === "buy"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUpDown className="w-4 h-4" />
              )}
              {loading
                ? "EXECUTING..."
                : direction === "buy"
                ? `Buy / Long ${symbol}`
                : `Sell / Short ${symbol}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
