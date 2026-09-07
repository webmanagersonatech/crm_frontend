import React from "react";

interface LocationItem {
  name?: string;
  label?: string;
  count?: number;
  value?: number;
}

interface LocationStatsCardProps {
  title: string;
  subtitle: string;
  items: LocationItem[];
  color: "blue" | "indigo" | "emerald";
  emptyText: string;
  icon: React.ReactNode;
}

const colorMap: Record<
  LocationStatsCardProps["color"],
  { bg: string; text: string; bar: string; ring: string }
> = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    bar: "bg-blue-500",
    ring: "ring-blue-100",
  },
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    bar: "bg-indigo-500",
    ring: "ring-indigo-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    bar: "bg-emerald-500",
    ring: "ring-emerald-100",
  },
};

const getName = (item: LocationItem) => item.name ?? item.label ?? "—";
const getCount = (item: LocationItem) => item.count ?? item.value ?? 0;

export const LocationStatsCard: React.FC<LocationStatsCardProps> = ({
  title,
  subtitle,
  items,
  color,
  emptyText,
  icon,
}) => {
  const c = colorMap[color];
  const sorted = [...items].sort((a, b) => getCount(b) - getCount(a));
  const maxCount = sorted.length > 0 ? getCount(sorted[0]) : 0;

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ${c.ring}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.text} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          {sorted.length > 0 && (
            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-0.5">
              {sorted.length}
            </span>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{emptyText}</p>
      ) : (
        <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {sorted.map((item, idx) => {
            const count = getCount(item);
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <li key={`${getName(item)}-${idx}`}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 truncate">{getName(item)}</span>
                  <span className="text-gray-500 font-medium">{count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${c.bar} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LocationStatsCard;