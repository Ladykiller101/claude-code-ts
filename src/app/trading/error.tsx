"use client";

export default function TradingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen bg-[#06060a] flex items-center justify-center"
      style={{ fontFamily: "JetBrains Mono, monospace" }}
    >
      <div className="text-center max-w-md px-6">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-red-400 text-xl">!</span>
        </div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-500 mb-6 break-words">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-white text-xs font-medium tracking-wider uppercase"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
