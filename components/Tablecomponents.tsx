"use client";
import React from "react";
import Spinner from "@/components/Spinner";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
    header: string;
    accessor?: keyof T | string;
    render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    currentPage?: number;
    totalPages?: number;
    totalEntries?: number;
    onPageChange?: (page: number) => void;
    highlightToday?: boolean;
}

export function DataTable<T extends { _id?: string }>({
    columns,
    data,
    loading = false,
    currentPage = 1,
    totalEntries = 0,
    totalPages = 1,
    highlightToday = false,
    onPageChange,
}: DataTableProps<T>) {

    const isToday = (dateString?: string) => {
        if (!dateString) return false;

        const now = new Date();
        const date = new Date(dateString);

        // Start of today (12:00 AM)
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        // End of today (11:59:59 PM)
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        return date >= startOfDay && date <= endOfDay;
    };
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-soft border border-gray-200/70 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[800px] border-collapse">
                    <thead className="bg-slate-50 dark:bg-neutral-800/60 text-slate-500 dark:text-neutral-400 border-b border-slate-200 dark:border-neutral-800">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="text-center py-10 text-sm text-slate-400 dark:text-neutral-500"
                                >
                                    <Spinner />
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="text-center py-10 text-sm text-slate-400 dark:text-neutral-500"
                                >
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => (
                                <tr
                                    key={row._id || idx}
                                    className={`
    border-b border-slate-100 dark:border-neutral-800 last:border-b-0
    transition-colors duration-150
    ${highlightToday && isToday((row as any).createdAt)
                                            ? // Today's lead highlight
                                            "bg-emerald-50 hover:bg-emerald-100/70 dark:bg-emerald-900/20 border-l-4 border-emerald-500"
                                            : (row as any).isduplicate
                                                ? // Duplicate lead
                                                "bg-rose-50 border-rose-300 hover:bg-rose-100/70 dark:bg-rose-900/20"
                                                : (row as any).status === "inactive"
                                                    ? // Inactive lead
                                                    "bg-rose-50/60 hover:bg-rose-50 dark:bg-rose-900/10"
                                                    : // Default row
                                                    "hover:bg-slate-50/80 dark:hover:bg-neutral-800/60"
                                        }
  `}
                                >
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="px-4 py-2.5 text-slate-700 dark:text-neutral-200 align-middle">
                                            {col.render
                                                ? col.render(row, idx)
                                                : (row as any)[col.accessor as string]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {onPageChange && (
                <div className="flex flex-wrap gap-3 justify-between items-center px-4 py-3 text-sm text-gray-600 dark:text-gray-300 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900">
                    <span className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs text-gray-700 dark:text-gray-300">
                            Page <b>{currentPage}</b> of <b>{totalPages}</b>
                        </span>
                        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                            <span className="text-gray-500 dark:text-gray-400">
                                Total Entries:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {totalEntries}
                            </span>
                        </span>

                    </span>


                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                        <button
                            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
