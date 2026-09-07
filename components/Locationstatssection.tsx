import React, { useState } from "react";
import LocationStatsCard from "./LocationStatsCard";

import { exportLocationStatsToPDF, LocationStats } from "./Exportlocationstats";
// import { exportLocationStatsToPDF, LocationStats } from "./exportLocationStats";
import LocationPieChart from "./Locationpiechart";
interface LocationStatsSectionProps {
    activeFilters: string[];
    locationStats: LocationStats | null;
}

type ViewMode = "list" | "pie";

const CountryIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M21 10.5a2.5 2.5 0 01-2.5 2.5H17m2-6h2.5M3 13.5h2.5M21 18.5h-2.5M5 3.5h2.5"
        />
    </svg>
);

const StateIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
    </svg>
);

const CityIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ExportIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
    </svg>
);

const SpinnerIcon = (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

const ListViewIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const PieViewIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
);

export const LocationStatsSection: React.FC<LocationStatsSectionProps> = ({
    activeFilters,
    locationStats,
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("list");

    if (!activeFilters.includes("locationStats") || !locationStats) {
        return null;
    }

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 150));
            exportLocationStatsToPDF(locationStats);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Location Analytics</h2>
                    <p className="text-sm text-gray-500">Countries, states, and cities breakdown</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "list"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {ListViewIcon}
                            List
                        </button>
                        <button
                            onClick={() => setViewMode("pie")}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "pie"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {PieViewIcon}
                            Pie
                        </button>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isExporting ? SpinnerIcon : ExportIcon}
                        {isExporting ? "Exporting..." : "Export PDF"}
                    </button>
                </div>
            </div>

            {viewMode === "list" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <LocationStatsCard
                        title="Countries"
                        subtitle="Geographic distribution"
                        items={locationStats.countries || []}
                        color="blue"
                        emptyText="No country data available"
                        icon={CountryIcon}
                    />
                    <LocationStatsCard
                        title="States / Regions"
                        subtitle="Regional breakdown"
                        items={locationStats.states || []}
                        color="indigo"
                        emptyText="No state data available"
                        icon={StateIcon}
                    />
                    <LocationStatsCard
                        title="Cities"
                        subtitle="Urban analytics"
                        items={locationStats.cities || []}
                        color="emerald"
                        emptyText="No city data available"
                        icon={CityIcon}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <LocationPieChart
                        title="Countries"
                        items={locationStats.countries || []}
                        color="blue"
                        emptyText="No country data available"
                    />
                    <LocationPieChart
                        title="States / Regions"
                        items={locationStats.states || []}
                        color="indigo"
                        emptyText="No state data available"
                    />
                    <LocationPieChart
                        title="Cities"
                        items={locationStats.cities || []}
                        color="emerald"
                        emptyText="No city data available"
                    />
                </div>
            )}
        </div>
    );
};

export default LocationStatsSection;