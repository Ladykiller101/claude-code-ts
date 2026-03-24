"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

// Types for lightweight-charts (loaded dynamically)
type IChartApi = import("lightweight-charts").IChartApi;
type ISeriesApi<T extends import("lightweight-charts").SeriesType> = import("lightweight-charts").ISeriesApi<T>;
type CandlestickData = import("lightweight-charts").CandlestickData;
type HistogramData = import("lightweight-charts").HistogramData;
type Time = import("lightweight-charts").Time;

interface PriceChartProps {
  symbol?: string;
}

const TIME_RANGES = ["1m", "5m", "15m", "1h", "4h", "1D"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

// Map display intervals to API intervals (API uses lowercase "1d" not "1D")
function toApiInterval(range: TimeRange): string {
  return range === "1D" ? "1d" : range;
}

// ─── Fallback mock data generator (used when API is unavailable) ───

function generateMockData(
  timeRange: TimeRange,
  basePrice: number,
  count: number = 200
): { candles: CandlestickData[]; volumes: HistogramData[] } {
  const candles: CandlestickData[] = [];
  const volumes: HistogramData[] = [];
  const now = Math.floor(Date.now() / 1000);

  const intervalSeconds: Record<TimeRange, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1D": 86400,
  };

  const interval = intervalSeconds[timeRange];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const time = (now - (count - i) * interval) as Time;
    const volatility = basePrice * 0.002;
    const open = price;
    const close = open + (Math.random() - 0.48) * volatility * 2;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = Math.random() * 1000 + 200;

    candles.push({
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });

    volumes.push({
      time,
      value: parseFloat(volume.toFixed(0)),
      color: close >= open ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
    });

    price = close;
  }

  return { candles, volumes };
}

const BASE_PRICES: Record<string, number> = {
  "BTC-PERP": 67500,
  "ETH-PERP": 3450,
  "SOL-PERP": 145,
  "ARB-PERP": 1.12,
  "DOGE-PERP": 0.165,
  "AVAX-PERP": 38.5,
  "LINK-PERP": 14.8,
  "OP-PERP": 2.65,
};

// ─── Fetch candle data from API ───

interface ApiCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchCandles(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<{ candles: CandlestickData[]; volumes: HistogramData[] }> {
  const res = await fetch(
    `/api/hyperliquid/candles?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
  );

  if (!res.ok) {
    throw new Error(`Candles API returned ${res.status}`);
  }

  const json = await res.json();

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error("Invalid candle data response");
  }

  const data: ApiCandle[] = json.data;

  const candles: CandlestickData[] = data.map((c) => ({
    // lightweight-charts expects time in seconds (UTCTimestamp)
    time: (Math.floor(c.time / 1000)) as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));

  const volumes: HistogramData[] = data.map((c) => ({
    time: (Math.floor(c.time / 1000)) as Time,
    value: c.volume,
    color:
      c.close >= c.open
        ? "rgba(16, 185, 129, 0.3)"
        : "rgba(239, 68, 68, 0.3)",
  }));

  return { candles, volumes };
}

// ─── Component ───

export default function PriceChart({ symbol = "BTC-PERP" }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("15m");
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "mock" | null>(null);

  const initChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    const { createChart, ColorType } = await import("lightweight-charts");
    setLoaded(true);

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#71717a",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        vertLine: {
          color: "rgba(16,185,129,0.3)",
          labelBackgroundColor: "#10b981",
        },
        horzLine: {
          color: "rgba(16,185,129,0.3)",
          labelBackgroundColor: "#10b981",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeriesRef.current = volumeSeries;

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Fetch real data, fall back to mock on failure
    setIsLoading(true);
    try {
      const apiInterval = toApiInterval(timeRange);
      const { candles, volumes } = await fetchCandles(symbol, apiInterval, 200);

      if (candles.length === 0) {
        throw new Error("Empty candle data");
      }

      candleSeries.setData(candles);
      volumeSeries.setData(volumes);
      setDataSource("live");
    } catch (err) {
      console.warn("Failed to fetch candle data from API, using mock data:", err);
      const basePrice = BASE_PRICES[symbol] || 100;
      const { candles, volumes } = generateMockData(timeRange, basePrice);
      candleSeries.setData(candles);
      volumeSeries.setData(volumes);
      setDataSource("mock");
    } finally {
      setIsLoading(false);
    }

    chart.timeScale().fitContent();

    // Responsive resize
    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [symbol, timeRange]);

  useEffect(() => {
    const cleanup = initChart();
    return () => {
      cleanup?.then((fn) => fn?.());
    };
  }, [initChart]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass rounded-2xl overflow-hidden flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{symbol}</span>
          <span
            className="text-[11px] text-zinc-500 uppercase tracking-wider"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            Hyperliquid
          </span>
          {dataSource === "mock" && (
            <span
              className="text-[9px] text-amber-500/70 uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              Mock
            </span>
          )}
        </div>

        {/* Time range selector */}
        <div className="flex gap-0.5 bg-white/[0.03] rounded-lg p-0.5">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all tracking-wider ${
                timeRange === range
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative min-h-[300px]">
        {(!loaded || isLoading) && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </motion.div>
  );
}
