import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface LocationItem {
  name?: string;
  label?: string;
  count?: number;
  value?: number;
}

interface LocationPieChartProps {
  title: string;
  items: LocationItem[];
  color: "blue" | "indigo" | "emerald";
  emptyText: string;
  maxSlices?: number; // group the rest into "Others"
}

const getName = (item: LocationItem) => item.name ?? item.label ?? "—";
const getCount = (item: LocationItem) => item.count ?? item.value ?? 0;

// Each palette gives a base hue with lighter/darker steps so slices
// stay visually related to the card's accent color but stay distinct.
const palettes: Record<LocationPieChartProps["color"], string[]> = {
  blue: ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
  indigo: ["#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"],
  emerald: ["#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"],
};

const OTHERS_COLOR = "#d1d5db"; // gray-300

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { pct: string };
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: TooltipPayloadItem[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-900">{entry.name}</p>
      <p className="text-gray-500">
        {entry.value.toLocaleString()} ({entry.payload.pct}%)
      </p>
    </div>
  );
};

export const LocationPieChart: React.FC<LocationPieChartProps> = ({
  title,
  items,
  color,
  emptyText,
  maxSlices = 6,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const palette = palettes[color];

  const { chartData, fullList } = useMemo(() => {
    const sorted = [...items].sort((a, b) => getCount(b) - getCount(a));
    const total = sorted.reduce((sum, i) => sum + getCount(i), 0);

    const top = sorted.slice(0, maxSlices);
    const rest = sorted.slice(maxSlices);
    const restTotal = rest.reduce((sum, i) => sum + getCount(i), 0);

    // Slices actually drawn in the donut (top N + grouped "Others")
    const chart = top.map((item) => ({
      name: getName(item),
      value: getCount(item),
      pct: total > 0 ? ((getCount(item) / total) * 100).toFixed(1) : "0.0",
    }));

    if (restTotal > 0) {
      chart.push({
        name: `Others (${rest.length})`,
        value: restTotal,
        pct: total > 0 ? ((restTotal / total) * 100).toFixed(1) : "0.0",
      });
    }

    // Every item, individually, for the scrollable legend below the chart
    const full = sorted.map((item, idx) => ({
      name: getName(item),
      value: getCount(item),
      pct: total > 0 ? ((getCount(item) / total) * 100).toFixed(1) : "0.0",
      isOthers: idx >= maxSlices,
      colorIdx: idx,
    }));

    return { chartData: chart, fullList: full };
  }, [items, maxSlices]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-sm text-gray-400 py-10 text-center">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              onMouseEnter={(_, idx) => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((entry, idx) => {
                const isOthers = entry.name.startsWith("Others");
                const baseColor = isOthers ? OTHERS_COLOR : palette[idx % palette.length];
                return (
                  <Cell
                    key={`cell-${idx}`}
                    fill={baseColor}
                    stroke="#ffffff"
                    strokeWidth={2}
                    opacity={activeIndex === null || activeIndex === idx ? 1 : 0.4}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Full scrollable legend — every item, not just the top slices drawn in the donut */}
      <div className="flex items-center justify-between mt-3 mb-1.5">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          All {fullList.length}
        </span>
      </div>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-2 scroll-smooth border-t border-gray-100 pt-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {fullList.map((entry, idx) => {
          const dotColor = entry.isOthers
            ? OTHERS_COLOR
            : palette[entry.colorIdx % palette.length];
          // Only slices actually drawn in the pie (idx < maxSlices) can highlight it on hover
          const chartIdx = entry.isOthers ? chartData.length - 1 : idx;
          return (
            <li
              key={`${entry.name}-${idx}`}
              className="flex items-center justify-between text-xs"
              onMouseEnter={() => setActiveIndex(chartIdx)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="text-gray-600 truncate">{entry.name}</span>
              </span>
              <span className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-gray-400">{entry.value.toLocaleString()}</span>
                <span className="text-gray-500 font-medium w-10 text-right">{entry.pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LocationPieChart;