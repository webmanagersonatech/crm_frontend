"use client";
import React from "react";
import Spinner from "@/components/Spinner";

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
}

export function DataTable<T extends { _id?: string }>({
    columns,
    data,
    loading = false,
    currentPage = 1,
    totalEntries = 0,
    totalPages = 1,
    onPageChange,
}: DataTableProps<T>) {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[800px]">
                    <thead className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className="px-4 py-2">
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
                                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                                >
                                    <Spinner />
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="text-center py-6 text-gray-500 dark:text-gray-400"
                                >
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => (
                                <tr
                                    key={row._id || idx}
                                    className={`
    border-b border-gray-200 dark:border-neutral-800

    ${(row as any).isduplicate
                                            ? "bg-red-100 border-red-400 hover:bg-red-200"
                                            : (row as any).status === "inactive"
                                                ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/20"
                                                : "hover:bg-gray-50 dark:hover:bg-neutral-800"
                                        }
  `}
                                >

                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className="px-4 py-2">
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
                <div className="flex justify-between items-center p-4 text-sm text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300">
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
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
