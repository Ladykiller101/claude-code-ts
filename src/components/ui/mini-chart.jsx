import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function MiniChart({ data, title, color = "emerald" }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [displayValue, setDisplayValue] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  useEffect(() => {
    if (hoveredIndex !== null) {
      setDisplayValue(data[hoveredIndex].value);
    }
  }, [hoveredIndex, data]);

  const handleContainerEnter = () => setIsHovering(true);
  const handleContainerLeave = () => {
    setIsHovering(false);
    setHoveredIndex(null);
    setTimeout(() => {
      setDisplayValue(null);
    }, 150);
  };

  const colorClasses = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleContainerEnter}
      onMouseLeave={handleContainerLeave}
      className="group relative w-full p-6 rounded-2xl bg-[#14141f] border border-gray-800 backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-gray-700 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", colorClasses[color])} />
          <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">{title}</span>
        </div>
        <div className="relative h-7 flex items-center">
          <span
            className={cn(
              "text-lg font-semibold tabular-nums transition-all duration-300 ease-out",
              isHovering && displayValue !== null ? "opacity-100 text-white" : "opacity-50 text-gray-500"
            )}
          >
            {displayValue !== null ? displayValue : ""}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-2 h-24">
        {data.map((item, index) => {
          const heightPx = (item.value / maxValue) * 96;
          const isHovered = hoveredIndex === index;
          const isAnyHovered = hoveredIndex !== null;
          const isNeighbor = hoveredIndex !== null && (index === hoveredIndex - 1 || index === hoveredIndex + 1);

          return (
            <div
              key={item.label}
              className="relative flex-1 flex flex-col items-center justify-end h-full"
              onMouseEnter={() => setHoveredIndex(index)}
            >
              {/* Bar */}
              <div
                className={cn(
                  "w-full rounded-full cursor-pointer transition-all duration-300 ease-out origin-bottom",
                  isHovered
                    ? `bg-${color}-500`
                    : isNeighbor
                    ? `bg-${color}-300`
                    : isAnyHovered
                    ? `bg-${color}-200`
                    : `bg-${color}-300 group-hover:bg-${color}-400`
                )}
                style={{
                  height: `${heightPx}px`,
                  transform: isHovered ? "scaleX(1.15) scaleY(1.02)" : isNeighbor ? "scaleX(1.05)" : "scaleX(1)",
                  backgroundColor: isHovered 
                    ? `var(--${color}-500)` 
                    : isNeighbor 
                    ? `var(--${color}-300)` 
                    : isAnyHovered 
                    ? `var(--${color}-200)` 
                    : undefined,
                }}
              />

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-medium mt-2 transition-all duration-300",
                  isHovered ? "text-white" : "text-gray-500"
                )}
              >
                {item.label}
              </span>

              {/* Tooltip */}
              <div
                className={cn(
                  "absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs font-medium transition-all duration-200 whitespace-nowrap z-10",
                  isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
                )}
              >
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
}