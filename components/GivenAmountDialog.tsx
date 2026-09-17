"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
    addPaidFeeRequest,
    getPaidFeesRequest,
    type PaidFeeRecord,
    type YearOption,
} from "@/app/lib/request/studentRequest";

interface GivenAmountDialogProps {
    open: boolean;
    studentId: string | null;
    programId?: string | null;
    onClose: () => void;
    onSuccess?: () => void;
}

interface Entry {
    amount: string;
    description: string;
}

export default function GivenAmountDialog({
    open,
    studentId,
    programId,
    onClose,
    onSuccess,
}: GivenAmountDialogProps) {
    const [year, setYear] = useState("");
    const [entries, setEntries] = useState<Entry[]>([
        { amount: "", description: "" },
    ]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [existingFees, setExistingFees] = useState<PaidFeeRecord[]>([]);
    const [yearOptions, setYearOptions] = useState<YearOption[]>([]);

    const existingForYear = existingFees.find(
        (f) => Number(f.year) === Number(year)
    );
    const isEditing = !!existingForYear;

    /* ── Reset + fetch when dialog opens ── */
    useEffect(() => {
        if (!open) return;

        setYear("");
        setEntries([{ amount: "", description: "" }]);
        setExistingFees([]);
        setYearOptions([]);

        if (studentId) {
            loadExistingFees(studentId);
        }
    }, [open, studentId]);

    const loadExistingFees = async (sid: string) => {
        try {
            setFetching(true);
            const res = await getPaidFeesRequest(sid);
            if (res.success) {
                setExistingFees(res.data.paidFees || []);
                setYearOptions(res.data.yearOptions || []);
            }
        } catch (err: any) {
            console.error("Failed to load existing fees:", err.message);
        } finally {
            setFetching(false);
        }
    };

    /* ── When year changes, populate entries from existing record ── */
    useEffect(() => {
        if (!year) return;

        const match = existingFees.find(
            (f) => Number(f.year) === Number(year)
        );

        if (match && match.entries?.length) {
            setEntries(
                match.entries.map((e) => ({
                    amount: String(e.amount ?? ""),
                    description: e.description ?? "",
                }))
            );
        } else {
            setEntries([{ amount: "", description: "" }]);
        }
    }, [year, existingFees]);

    const totalAmount = entries.reduce((sum, e) => {
        const n = Number(e.amount);
        return sum + (isNaN(n) ? 0 : n);
    }, 0);

    const addEntry = () =>
        setEntries((prev) => [...prev, { amount: "", description: "" }]);

    const removeEntry = (i: number) =>
        setEntries((prev) => prev.filter((_, idx) => idx !== i));

    const updateEntry = (i: number, field: keyof Entry, value: string) =>
        setEntries((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e))
        );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!studentId) return toast.error("Student not selected");
        if (!year) return toast.error("Please select year");

        const cleaned = entries.filter(
            (e) => e.amount && Number(e.amount) > 0
        );

        if (cleaned.length === 0)
            return toast.error("Please add at least one valid amount");

        if (cleaned.length !== entries.length)
            return toast.error("Please fill or remove empty entries");

        try {
            setLoading(true);

            const res = await addPaidFeeRequest(studentId, {
                year: Number(year),
                programId: programId || undefined,
                entries: cleaned.map((e) => ({
                    amount: Number(e.amount),
                    description: e.description.trim(),
                })),
            });

            if (!res.success) throw new Error(res.message);

            toast.success(
                isEditing
                    ? "Given amount updated successfully"
                    : "Given amount added successfully"
            );
            onSuccess?.();
            onClose();
        } catch (error: any) {
            toast.error(error?.message || "Failed to save given amount");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white w-full max-w-lg rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">
                                    {isEditing ? "Edit Given Amount" : "Add Given Amount"}
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    {isEditing
                                        ? `Editing existing entry for Year ${year}`
                                        : "Add payment details for a specific year"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Year */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Year <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    disabled={loading || fetching}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">
                                        {fetching ? "Loading..." : "Select Year"}
                                    </option>
                                    {yearOptions.map((y) => (
                                        <option key={y.value} value={y.value}>
                                            {y.label}
                                            {y.hasEntry ? "  •  (already added)" : ""}
                                        </option>
                                    ))}
                                </select>

                                {year && (
                                    <div className="mt-2">
                                        {isEditing ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                <Pencil className="w-3 h-3" />
                                                Editing existing entry
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                                <Plus className="w-3 h-3" />
                                                New entry for this year
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Entries */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Amount Details <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addEntry}
                                        disabled={loading}
                                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add More
                                    </button>
                                </div>

                                {entries.map((entry, index) => (
                                    <div
                                        key={index}
                                        className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-500">
                                                Entry {index + 1}
                                            </span>
                                            {entries.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeEntry(index)}
                                                    disabled={loading}
                                                    className="p-1 rounded text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                ₹
                                            </span>
                                            <input
                                                type="number"
                                                min="1"
                                                step="0.01"
                                                value={entry.amount}
                                                onChange={(e) =>
                                                    updateEntry(index, "amount", e.target.value)
                                                }
                                                placeholder="Enter amount"
                                                disabled={loading}
                                                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            />
                                        </div>

                                        <input
                                            type="text"
                                            value={entry.description}
                                            onChange={(e) =>
                                                updateEntry(index, "description", e.target.value)
                                            }
                                            placeholder="Enter description"
                                            disabled={loading}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <span className="text-sm font-medium text-blue-800">
                                    Total Amount
                                </span>
                                <span className="text-base font-semibold text-blue-900">
                                    ₹ {totalAmount.toLocaleString("en-IN")}
                                </span>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || fetching}
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {loading
                                        ? "Saving..."
                                        : isEditing
                                            ? "Update Amount"
                                            : "Save Amount"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}