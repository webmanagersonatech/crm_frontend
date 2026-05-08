// LocationStatsCard.tsx

interface LocationItem {
  name: string;
  count: number;
}

interface LocationStatsCardProps {
  title: string;
  subtitle: string;
  items: LocationItem[];
  color: "blue" | "indigo" | "emerald";
  emptyText: string;
  icon: React.ReactNode;
}

const colorClasses = {
  blue: {
    bar: "from-blue-500 to-blue-600",
    badge: "bg-blue-50 text-blue-700 ring-blue-700/10",
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    progress: "from-blue-500 to-blue-400",
  },
  indigo: {
    bar: "from-indigo-500 to-indigo-600",
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-700/10",
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-600",
    progress: "from-indigo-500 to-indigo-400",
  },
  emerald: {
    bar: "from-emerald-500 to-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-700/10",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    progress: "from-emerald-500 to-emerald-400",
  },
};

export default function LocationStatsCard({
  title,
  subtitle,
  items = [],
  color,
  emptyText,
  icon,
}: LocationStatsCardProps) {
  const styles = colorClasses[color];

  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Accent Bar */}
      <div
        className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${styles.bar} rounded-l-2xl`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl ${styles.iconBg} flex items-center justify-center ${styles.iconText}`}
            >
              {icon}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium rounded-full ring-1 ${styles.badge}`}
          >
            {items.length}
          </span>
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto custom-scrollbar pr-1 space-y-3">
          {items.map((item) => {
            const percentage = (item.count / maxCount) * 100;

            return (
              <div
                key={item.name}
                className="group/item transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-800 truncate flex-1">
                    {item.name || "Unknown"}
                  </span>

                  <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`bg-gradient-to-r ${styles.progress} h-1.5 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">{emptyText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

