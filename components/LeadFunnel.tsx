"use client";
import { motion } from "framer-motion";
import {
    HiOutlineUserGroup,
    HiOutlinePhone,
    HiOutlineXCircle,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineBan,
    HiOutlineAcademicCap,
    HiOutlineLockClosed,
    HiOutlineFilter,
    HiOutlineTrendingUp,
    HiOutlineTrendingDown,
    HiOutlineChartPie,
    HiOutlinePresentationChartBar,
    HiOutlineChartBar,
    HiOutlineChartSquareBar
} from 'react-icons/hi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { useState } from 'react';

interface StatusCount {
    _id: string;
    count: number;
}

interface LeadFunnelProps {
    statusCounts: StatusCount[];
    totalLeads: number;
    className?: string;
}

// ONLY your actual statuses - nothing fake!
const VALID_STATUSES = [
    "New",
    "Followup",
    "Not Reachable",
    "Switched Off",
    "Not Picked",
    "Irrelevant",
    "Interested",
    "Not Interested",
    "Cut the call",
    "Admitted",
    "Closed"
] as const;

type ValidStatus = typeof VALID_STATUSES[number];

// Icon mapping for each status
const statusIcons: Record<string, any> = {
    New: HiOutlineUserGroup,
    Followup: HiOutlinePhone,
    "Not Reachable": HiOutlineBan,
    "Switched Off": HiOutlineXCircle,
    "Not Picked": HiOutlineClock,
    Irrelevant: HiOutlineXCircle,
    Interested: HiOutlineCheckCircle,
    "Not Interested": HiOutlineXCircle,
    "Cut the call": HiOutlinePhone,
    Admitted: HiOutlineAcademicCap,
    Closed: HiOutlineLockClosed,
};

const statusConfig: Record<string, { color: string; bgColor: string; gradient: string; category: 'active' | 'lost' | 'converted' | 'closed'; pieColor: string }> = {
    New: { color: "text-[#2563eb]", bgColor: "bg-[#2563eb]/10", gradient: "from-[#2563eb] to-[#1d4ed8]", category: "active", pieColor: "#2563eb" },
    Followup: { color: "text-[#7c3aed]", bgColor: "bg-[#7c3aed]/10", gradient: "from-[#7c3aed] to-[#6d28d9]", category: "active", pieColor: "#7c3aed" },
    "Not Reachable": { color: "text-[#d97706]", bgColor: "bg-[#d97706]/10", gradient: "from-[#d97706] to-[#b45309]", category: "lost", pieColor: "#d97706" },
    "Switched Off": { color: "text-[#dc2626]", bgColor: "bg-[#dc2626]/10", gradient: "from-[#dc2626] to-[#b91c1c]", category: "lost", pieColor: "#dc2626" },
    "Not Picked": { color: "text-[#ea580c]", bgColor: "bg-[#ea580c]/10", gradient: "from-[#ea580c] to-[#c2410c]", category: "lost", pieColor: "#ea580c" },
    Irrelevant: { color: "text-[#9333ea]", bgColor: "bg-[#9333ea]/10", gradient: "from-[#9333ea] to-[#7e22ce]", category: "lost", pieColor: "#9333ea" },
    Interested: { color: "text-[#059669]", bgColor: "bg-[#059669]/10", gradient: "from-[#059669] to-[#047857]", category: "active", pieColor: "#059669" },
    "Not Interested": { color: "text-[#b91c1c]", bgColor: "bg-[#b91c1c]/10", gradient: "from-[#b91c1c] to-[#991b1b]", category: "lost", pieColor: "#b91c1c" },
    "Cut the call": { color: "text-[#db2777]", bgColor: "bg-[#db2777]/10", gradient: "from-[#db2777] to-[#be185d]", category: "lost", pieColor: "#db2777" },
    Admitted: { color: "text-[#0d9488]", bgColor: "bg-[#0d9488]/10", gradient: "from-[#0d9488] to-[#0f766e]", category: "converted", pieColor: "#0d9488" },
    Closed: { color: "text-[#4b5563]", bgColor: "bg-[#4b5563]/10", gradient: "from-[#4b5563] to-[#374151]", category: "closed", pieColor: "#4b5563" },
};

// Category colors for summary
const categoryColors = {
    active: "#2563eb",
    lost: "#dc2626",
    converted: "#0d9488",
    closed: "#4b5563"
};

type ChartType = 'cards' | 'pie' | 'bar' | 'line' | 'area';

export default function LeadFunnel({
    statusCounts,
    totalLeads,
    className = ""
}: LeadFunnelProps) {
    const [viewMode, setViewMode] = useState<ChartType>('cards');

    // Filter to ONLY show statuses that exist in your data
    const validStatusCounts = statusCounts.filter(item =>
        VALID_STATUSES.includes(item._id as ValidStatus)
    );

    const getPercentage = (count: number): string => {
        if (!totalLeads) return "0";
        return ((count / totalLeads) * 100).toFixed(1);
    };

    const getCategoryTotal = (category: string): number => {
        return validStatusCounts
            ?.filter(item => statusConfig[item._id]?.category === category)
            .reduce((acc, item) => acc + item.count, 0) || 0;
    };

    const activeTotal = getCategoryTotal('active');
    const lostTotal = getCategoryTotal('lost');
    const convertedTotal = getCategoryTotal('converted');
    const closedTotal = getCategoryTotal('closed');

    // Prepare data for category pie chart
    const categoryPieData = [
        { name: 'Active', value: activeTotal, color: categoryColors.active },
        { name: 'Lost', value: lostTotal, color: categoryColors.lost },
        { name: 'Converted', value: convertedTotal, color: categoryColors.converted },
        ...(closedTotal > 0 ? [{ name: 'Closed', value: closedTotal, color: categoryColors.closed }] : [])
    ].filter(item => item.value > 0);

    // Prepare data for detailed status charts
    const detailedChartData = validStatusCounts.map(item => ({
        name: item._id,
        value: item.count,
        percentage: parseFloat(getPercentage(item.count)),
        color: statusConfig[item._id]?.pieColor || '#6b7280',
        category: statusConfig[item._id]?.category || 'other'
    }));

    // Sort by value for better visualization
    const sortedDetailedData = [...detailedChartData].sort((a, b) => b.value - a.value);

    // Prepare funnel data (for funnels)
    const funnelData = [
        { name: 'Total Leads', value: totalLeads, color: '#6366f1' },
        { name: 'Active', value: activeTotal, color: categoryColors.active },
        { name: 'Interested', value: detailedChartData.find(d => d.name === 'Interested')?.value || 0, color: '#059669' },
        { name: 'Converted', value: convertedTotal, color: categoryColors.converted }
    ].filter(item => item.value > 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{data.name || label}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Count: <span className="font-semibold">{data.value || payload[0].value}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Percentage: <span className="font-semibold">
                            {((data.value || payload[0].value) / totalLeads * 100).toFixed(1)}%
                        </span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const renderPieCharts = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Category Summary Pie */}
            <div className="bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <HiOutlineChartPie className="w-4 h-4" />
                    By Category
                </h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryPieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => {
                                    const percentage = percent !== undefined ? (percent * 100).toFixed(0) : '0';
                                    return `${name} ${percentage}%`;
                                }}
                                labelLine={false}
                            >
                                {categoryPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Status Pie */}
            <div className="bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <HiOutlinePresentationChartBar className="w-4 h-4" />
                    By Status
                </h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sortedDetailedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => {
                                    const percentageValue = percent !== undefined ? (percent * 100) : 0;
                                    const percentage = percentageValue.toFixed(0);
                                    return percentageValue > 3 ? `${name} ${percentage}%` : ''; // Only show if > 3%
                                }}
                                labelLine={false}
                            >
                                {sortedDetailedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderBarCharts = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Horizontal Bar Chart - Category */}
            <div className="bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <HiOutlineChartBar className="w-4 h-4" />
                    Category Distribution
                </h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={categoryPieData}
                            margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {categoryPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Vertical Bar Chart - Detailed Status */}
            <div className="bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <HiOutlineChartSquareBar className="w-4 h-4" />
                    Status Distribution
                </h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sortedDetailedData.slice(0, 8)} // Show top 8 for readability
                            margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={0}
                                tick={{ fontSize: 10 }}
                            />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {sortedDetailedData.slice(0, 8).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderLineAndAreaCharts = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Funnel Line Chart */}
            <div className="bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <HiOutlineTrendingUp className="w-4 h-4" />
                    Lead Funnel Progression
                </h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={funnelData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#6366f1"
                                strokeWidth={3}
                                dot={{ fill: '#6366f1', r: 6 }}
                                activeDot={{ r: 8 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                fill="#6366f1"
                                fillOpacity={0.1}
                                stroke="none"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Area Chart - Category Comparison */}
            <div className="bg-gray-50/50 dark:bg-gray-800/50 p-4 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <HiOutlineTrendingDown className="w-4 h-4" />
                    Status Overview
                </h4>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={sortedDetailedData.slice(0, 6)}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#8884d8"
                                fill="#8884d8"
                                fillOpacity={0.3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderCards = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {validStatusCounts.map((item) => {
                const config = statusConfig[item._id] || {
                    color: "text-gray-600",
                    bgColor: "bg-gray-100",
                    gradient: "from-gray-400 to-gray-500",
                    category: "other",
                    pieColor: "#6b7280"
                };

                const percentage = getPercentage(item.count);
                const Icon = statusIcons[item._id] || HiOutlineUserGroup;

                return (
                    <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow h-[90px]"
                    >
                        {/* Background Progress Bar */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent"
                            style={{
                                background: `linear-gradient(90deg, ${config.pieColor} 0%, ${config.pieColor} ${percentage}%, transparent ${percentage}%)`,
                                opacity: 0.08
                            }}
                            initial={{ backgroundSize: "0% 100%" }}
                            animate={{ backgroundSize: "100% 100%" }}
                            transition={{ duration: 0.5 }}
                        />

                        {/* Content */}
                        <div className="relative p-3 h-full flex flex-col">
                            {/* Top Row - Icon and Count */}
                            <div className="flex items-center justify-between mb-2">
                                <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                </div>
                                <span className={`text-sm font-bold ${config.color}`}>
                                    {item.count}
                                </span>
                            </div>

                            {/* Bottom Section - Status and Progress */}
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                        {item._id}
                                    </span>
                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 ml-1">
                                        {percentage}%
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.5, delay: 0.1 }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: config.pieColor }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );

    if (!validStatusCounts || validStatusCounts.length === 0) {
        return null;
    }

    return (
        <div className={`w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm ${className}`}>
            {/* Header - CRM Style */}
            <div className="px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#1e2a5a] to-[#2a3a7a] rounded-lg shadow-md shrink-0">
                            <HiOutlineFilter className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">Lead Funnel</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Real-time status distribution</p>
                        </div>
                    </div>

                    {/* View Toggle - Enhanced with more options */}
                    <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'cards'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            Cards
                        </button>
                        <button
                            onClick={() => setViewMode('pie')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'pie'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <HiOutlineChartPie className="w-3.5 h-3.5" />
                            Pie
                        </button>
                        <button
                            onClick={() => setViewMode('bar')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'bar'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <HiOutlineChartBar className="w-3.5 h-3.5" />
                            Bar
                        </button>
                        <button
                            onClick={() => setViewMode('line')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'line' || viewMode === 'area'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <HiOutlineTrendingUp className="w-3.5 h-3.5" />
                            Line
                        </button>
                    </div>

                    {/* Category Stats - CRM Style */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#2563eb] shrink-0"></div>
                            <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                Active <span className="font-semibold text-gray-900 dark:text-white ml-1">{activeTotal}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#dc2626] shrink-0"></div>
                            <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                Lost <span className="font-semibold text-gray-900 dark:text-white ml-1">{lostTotal}</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#0d9488] shrink-0"></div>
                            <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                Converted <span className="font-semibold text-gray-900 dark:text-white ml-1">{convertedTotal}</span>
                            </span>
                        </div>
                        {closedTotal > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#4b5563] shrink-0"></div>
                                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    Closed <span className="font-semibold text-gray-900 dark:text-white ml-1">{closedTotal}</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content - Dynamic based on view mode */}
            <div className="p-5">
                {viewMode === 'cards' && renderCards()}
                {viewMode === 'pie' && renderPieCharts()}
                {viewMode === 'bar' && renderBarCharts()}
                {(viewMode === 'line' || viewMode === 'area') && renderLineAndAreaCharts()}
            </div>

            {/* Footer - CRM Style */}
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between text-xs rounded-b-xl">
                <div className="flex items-center gap-3">
                    <span className="text-gray-600 dark:text-gray-400">
                        Total Leads: <span className="font-semibold text-gray-900 dark:text-white">{totalLeads}</span>
                    </span>
                    <span className="w-px h-3 bg-gray-300 dark:bg-gray-700"></span>
                    <span className="text-gray-600 dark:text-gray-400">
                        Active Statuses: <span className="font-semibold text-gray-900 dark:text-white">{validStatusCounts.length}</span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-gray-500 dark:text-gray-500">Live</span>
                </div>
            </div>
        </div>
    );
}