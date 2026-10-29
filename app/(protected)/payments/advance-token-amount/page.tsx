"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Wallet,
    Search,
    Settings,
    X,
    Receipt,
    CreditCard,
    FileDown,
    Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

import { DataTable, Column } from "@/components/Tablecomponents";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import ExportModal from "@/components/ExportModal";

import {
    getPaidAdvanceTokenPayments,
    exportPaidAdvanceTokenPayments,
    AdvanceTokenPayment,
    AdvanceTokenPaymentSummary,
    PaymentGateway,
} from "@/app/lib/request/paymentRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";

/* ============================================================
   Helpers
============================================================ */
const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(n || 0);

const formatDate = (iso: string) =>
    iso
        ? new Date(iso).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "-";

const GATEWAY_BADGE: Record<PaymentGateway, string> = {
    razorpay: "bg-blue-100 text-blue-700",
    instamojo: "bg-orange-100 text-orange-700",
    ccavenue: "bg-purple-100 text-purple-700",
};

const COLUMN_OPTIONS = [
    { key: "student", label: "Student" },
    { key: "application", label: "Application" },
    { key: "program", label: "Program" },
    { key: "academicYear", label: "Academic Year" },
    { key: "gateway", label: "Gateway" },
    { key: "amount", label: "Amount" },
    { key: "gst", label: "GST" },
    { key: "total", label: "Total" },
    { key: "orderId", label: "Order ID" },
    { key: "paymentId", label: "Payment ID" },
    { key: "createdAt", label: "Date" },
    { key: "actions", label: "Actions" },
] as const;

type ColumnKey = (typeof COLUMN_OPTIONS)[number]["key"];
type ColumnVisibility = Record<ColumnKey, boolean>;

const DEFAULT_VISIBILITY: ColumnVisibility = {
    student: true,
    application: true,
    program: true,
    academicYear: true,
    gateway: true,
    amount: true,
    gst: true,
    total: true,
    orderId: true,
    paymentId: true,
    createdAt: true,
    actions: true,
};

const fullName = (s: AdvanceTokenPayment["student"]): string => {
    if (!s) return "";
    return `${s.firstname ?? ""} ${s.lastname ?? ""}`.trim();
};

/* ============================================================
   Page
============================================================ */
export default function AdvanceTokenPaymentsPage() {
    /* ---------- listing state ---------- */
    const [payments, setPayments] = useState<AdvanceTokenPayment[]>([]);
    const [summary, setSummary] = useState<AdvanceTokenPaymentSummary | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEntries, setTotalEntries] = useState(0);
    const [limit, setLimit] = useState(10);

    /* ---------- filters ---------- */
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [gateway, setGateway] = useState<PaymentGateway | "all">("all");

    /* ---------- role & institutions ---------- */
    const [role, setRole] = useState("");
    const [selectedInstitution, setSelectedInstitution] = useState("all");
    const [institutions, setInstitutions] = useState<
        { value: string; label: string }[]
    >([]);

    /* ---------- UI dialogs ---------- */
    const [customizeOpen, setCustomizeOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailPayment, setDetailPayment] =
        useState<AdvanceTokenPayment | null>(null);

    /* ---------- export ---------- */
    const [exportOpen, setExportOpen] = useState(false);
    const [exportData, setExportData] = useState<Record<string, unknown>[]>([]);
    const [exportLoading, setExportLoading] = useState(false);

    /* ---------- column visibility ---------- */
    const [columnVisibility, setColumnVisibility] =
        useState<ColumnVisibility>(DEFAULT_VISIBILITY);

    /* ============================================================
       Debounce search
    ============================================================ */
    useEffect(() => {
        const t = setTimeout(() => {
            setSearchTerm(searchInput.trim());
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    /* ============================================================
       Decode role from JWT
    ============================================================ */
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setRole(payload?.role || "");
        } catch (e) {
            console.error("Failed to decode token", e);
        }
    }, []);

    /* ============================================================
       Load institutions (superadmin only)
    ============================================================ */
    useEffect(() => {
        if (role !== "superadmin") return;
        let cancelled = false;

        (async () => {
            try {
                const res = await getActiveInstitutions();
                if (cancelled) return;
                setInstitutions(
                    res.map((i: { instituteId: string; name: string }) => ({
                        value: i.instituteId,
                        label: i.name,
                    }))
                );
            } catch {
                if (!cancelled) toast.error("Failed to load institutions");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [role]);

    /* ============================================================
       Fetch paid advance token payments
    ============================================================ */
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await getPaidAdvanceTokenPayments({
                    page: currentPage,
                    limit,
                    search: searchTerm || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    gateway,
                    instituteId:
                        role === "superadmin" && selectedInstitution !== "all"
                            ? selectedInstitution
                            : undefined,
                });

                if (cancelled) return;
                setPayments(res.data ?? []);
                setSummary(res.summary ?? null);
                setTotalPages(res.pagination?.totalPages ?? 1);
                setTotalEntries(res.pagination?.total ?? 0);
            } catch (err) {
                if (cancelled) return;
                const msg =
                    err instanceof Error
                        ? err.message
                        : "Failed to load advance token payments";
                setError(msg);
                toast.error(msg);
                setPayments([]);
                setSummary(null);
                setTotalPages(1);
                setTotalEntries(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        currentPage,
        limit,
        searchTerm,
        startDate,
        endDate,
        gateway,
        role,
        selectedInstitution,
    ]);

    /* ============================================================
       Detail modal
    ============================================================ */
    const openDetail = useCallback((p: AdvanceTokenPayment) => {
        setDetailPayment(p);
        setDetailOpen(true);
    }, []);

    const closeDetail = useCallback(() => {
        setDetailOpen(false);
        setDetailPayment(null);
    }, []);

    /* ============================================================
       Reset
    ============================================================ */
    const resetFilters = useCallback(() => {
        setSearchInput("");
        setSearchTerm("");
        setStartDate("");
        setEndDate("");
        setGateway("all");
        setSelectedInstitution("all");
        setCurrentPage(1);
    }, []);

    /* ============================================================
       Export — fetch full list → transform → open modal
    ============================================================ */
    const handleExport = useCallback(async () => {
        setExportLoading(true);
        try {
            const res = await exportPaidAdvanceTokenPayments({
                search: searchTerm || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                gateway,
                instituteId:
                    role === "superadmin" && selectedInstitution !== "all"
                        ? selectedInstitution
                        : undefined,
            });

            if (!res.data || res.data.length === 0) {
                toast.info("No data to export");
                return;
            }

            const rows = res.data.map((p) => {
                const obj: Record<string, unknown> = {};

                if (columnVisibility.student) {
                    obj.Student = fullName(p.student) || "-";
                    obj.Email = p.student?.email || "-";
                    obj.Mobile = p.student?.mobileNo || "-";
                }

                if (role === "superadmin" && columnVisibility.student) {
                    obj.Institute =
                        p.institute?.name ||
                        p.institute?.instituteName ||
                        p.instituteId ||
                        "-";
                }

                if (columnVisibility.application) {
                    obj.ApplicationID = p.applicationId || "-";
                }

                if (columnVisibility.program) {
                    obj.ProgramID = p.programId || "-";
                }

                if (columnVisibility.academicYear) {
                    obj.AcademicYear = p.academicYear || "-";
                }

                if (columnVisibility.gateway) {
                    obj.Gateway = p.gateway;
                }

                if (columnVisibility.amount) {
                    obj.BaseAmount = p.amount;
                }

                if (columnVisibility.gst) {
                    obj.GST = p.gstAmount;
                }

                if (columnVisibility.total) {
                    obj.Total = p.totalAmount;
                }

                if (columnVisibility.orderId) {
                    obj.OrderID = p.orderId || "-";
                }

                if (columnVisibility.paymentId) {
                    obj.PaymentID = p.paymentId || "-";
                }

                if (columnVisibility.createdAt) {
                    obj.Date = formatDate(p.createdAt);
                }

                obj.Status = p.status;
           

                return obj;
            });

            setExportData(rows);
            setExportOpen(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Export failed");
        } finally {
            setExportLoading(false);
        }
    }, [
        searchTerm,
        startDate,
        endDate,
        gateway,
        role,
        selectedInstitution,
        columnVisibility,
    ]);

    /* ============================================================
       Columns
    ============================================================ */
    const columns = useMemo<Column<AdvanceTokenPayment>[]>(() => {
        const all: (Column<AdvanceTokenPayment> | false)[] = [
            columnVisibility.student && {
                header: "Student",
                render: (p) => (
                    <div>
                        <div className="font-medium text-gray-900">
                            {fullName(p.student) || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                            {p.student?.email || "-"}
                        </div>
                    </div>
                ),
            },
            columnVisibility.application && {
                header: "Application",
                render: (p) => (
                    <code className="px-2 py-0.5 rounded bg-gray-100 text-xs">
                        {p.applicationId}
                    </code>
                ),
            },
            columnVisibility.program && {
                header: "Program",
                render: (p) => (
                    <code className="px-2 py-0.5 rounded bg-gray-100 text-xs">
                        {p.programId || "-"}
                    </code>
                ),
            },
            columnVisibility.academicYear && {
                header: "Academic Year",
                render: (p) => (
                    <span className="text-xs font-medium">{p.academicYear || "-"}</span>
                ),
            },
            columnVisibility.gateway && {
                header: "Gateway",
                render: (p) => (
                    <span
                        className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${GATEWAY_BADGE[p.gateway] ?? "bg-gray-100 text-gray-700"
                            }`}
                    >
                        {p.gateway}
                    </span>
                ),
            },
            columnVisibility.amount && {
                header: "Amount",
                render: (p) => <span className="text-sm">{formatINR(p.amount)}</span>,
            },
            columnVisibility.gst && {
                header: "GST",
                render: (p) => (
                    <span className="text-sm text-gray-600">
                        {formatINR(p.gstAmount)}
                    </span>
                ),
            },
            columnVisibility.total && {
                header: "Total",
                render: (p) => (
                    <span className="font-semibold text-green-700">
                        {formatINR(p.totalAmount)}
                    </span>
                ),
            },
            columnVisibility.orderId && {
                header: "Order ID",
                render: (p) => (
                    <span className="text-xs text-gray-600 font-mono">
                        {p.orderId ? `${p.orderId.slice(0, 16)}…` : "-"}
                    </span>
                ),
            },
            columnVisibility.paymentId && {
                header: "Payment ID",
                render: (p) => (
                    <span className="text-xs text-gray-600 font-mono">
                        {p.paymentId ? `${p.paymentId.slice(0, 14)}…` : "-"}
                    </span>
                ),
            },
            columnVisibility.createdAt && {
                header: "Date",
                render: (p) => (
                    <span className="text-xs">{formatDate(p.createdAt)}</span>
                ),
            },
            columnVisibility.actions && {
                header: "Actions",
                render: (p) => (
                    <button
                        type="button"
                        onClick={() => openDetail(p)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                        title="View Details"
                    >
                        <Receipt className="w-3.5 h-3.5" />
                        View
                    </button>
                ),
            },
        ];
        return all.filter(Boolean) as Column<AdvanceTokenPayment>[];
    }, [columnVisibility, openDetail]);

    /* ============================================================
       Render
    ============================================================ */
    return (
        <div className="p-6 space-y-6">
            {/* ---------- Header ---------- */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-blue-700" />
                    <h1 className="text-2xl font-semibold">
                        Advance Token Payments
                    </h1>
                </div>

                <button
                    type="button"
                    onClick={handleExport}
                    disabled={exportLoading}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md text-white ${exportLoading
                            ? "bg-emerald-400 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                >
                    {exportLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Fetching...
                        </>
                    ) : (
                        <>
                            <FileDown className="w-4 h-4" />
                            Export
                        </>
                    )}
                </button>
            </div>

            {/* ---------- Summary ---------- */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SummaryCard
                        label="Total Paid"
                        value={formatINR(summary.totalPaidAmount)}
                        accent="text-green-700"
                    />
                    <SummaryCard
                        label="Base Amount"
                        value={formatINR(summary.totalBaseAmount)}
                    />
                    <SummaryCard
                        label="GST Collected"
                        value={formatINR(summary.totalGst)}
                    />
                    <SummaryCard
                        label="Transactions"
                        value={String(summary.totalPaidCount)}
                    />
                </div>
            )}

            {/* ---------- Controls ---------- */}
            <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                    <button
                        type="button"
                        onClick={() => setCustomizeOpen(true)}
                        className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Customize Columns</span>
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Show
                            </span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-1.5 text-xs border border-gray-200 rounded-md bg-white"
                            >
                                {[10, 25, 50, 100, 250, 500].map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                            <span className="text-xs font-medium text-gray-500">
                                entries
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, email, order ID, payment ID, program"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                        />
                    </div>

                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                    />

                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                    />

                    {role === "superadmin" && (
                        <select
                            value={gateway}
                            onChange={(e) => {
                                setGateway(e.target.value as PaymentGateway | "all");
                                setCurrentPage(1);
                            }}
                            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                        >
                            <option value="all">All Gateways</option>
                            <option value="razorpay">Razorpay</option>
                            <option value="instamojo">Instamojo</option>
                            <option value="ccavenue">CCAvenue</option>
                        </select>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {role === "superadmin" && (
                        <select
                            value={selectedInstitution}
                            onChange={(e) => {
                                setSelectedInstitution(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                        >
                            <option value="all">All Institutions</option>
                            {institutions.map((inst) => (
                                <option key={inst.value} value={inst.value}>
                                    {inst.label}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        type="button"
                        onClick={resetFilters}
                        className="ml-auto text-xs px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* ---------- Table ---------- */}
            {error && !loading ? (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={payments}
                    loading={loading}
                    totalEntries={totalEntries}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}

            {/* ---------- Detail Modal ---------- */}
            <AdvancePaymentDetailModal
                open={detailOpen}
                payment={detailPayment}
                onClose={closeDetail}
            />

            {/* ---------- Export Modal ---------- */}
            <ExportModal
                open={exportOpen}
                title="Advance Token Payments"
                data={exportData}
                onClose={() => {
                    setExportOpen(false);
                    setTimeout(() => setExportData([]), 300);
                }}
                loading={exportLoading}
            />

            {/* ---------- Customize Columns ---------- */}
            <ColumnCustomizeDialog
                open={customizeOpen}
                title="Customize Columns"
                columns={COLUMN_OPTIONS as unknown as { key: string; label: string }[]}
                selected={columnVisibility}
                onChange={(v) => setColumnVisibility((p) => ({ ...p, ...v }))}
                onClose={() => setCustomizeOpen(false)}
            />
        </div>
    );
}

/* ============================================================
   Advance Payment Detail Modal
============================================================ */
function AdvancePaymentDetailModal({
    open,
    payment,
    onClose,
}: {
    open: boolean;
    payment: AdvanceTokenPayment | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && payment && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={onClose}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="advance-payment-detail-title"
                >
                    <motion.div
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -30, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-600" />
                                <h2
                                    id="advance-payment-detail-title"
                                    className="text-lg font-semibold text-gray-900"
                                >
                                    Advance Token Payment Details
                                </h2>
                            </div>

                            <div className="rounded-lg border bg-gray-50 p-4 space-y-2 text-sm">
                                <Row label="Student" value={fullName(payment.student) || "-"} />
                                <Row label="Email" value={payment.student?.email || "-"} />
                                <Row label="Mobile" value={payment.student?.mobileNo || "-"} />
                                <Row label="Application" value={payment.applicationId} mono />
                                <Row label="Program" value={payment.programId || "-"} mono />
                                <Row
                                    label="Academic Year"
                                    value={payment.academicYear || "-"}
                                />
                                <Row label="Gateway" value={payment.gateway} capitalize />
                                <Row label="Order ID" value={payment.orderId} mono />
                                <Row label="Payment ID" value={payment.paymentId || "-"} mono />
                                <Row
                                    label="Status"
                                    value={
                                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium capitalize">
                                            {payment.status}
                                        </span>
                                    }
                                />
                              
                              
                             
                                <Row label="Date" value={formatDate(payment.createdAt)} />
                            </div>

                            <div className="rounded-lg border p-4 space-y-2 text-sm">
                                <Row label="Base Amount" value={formatINR(payment.amount)} />
                                <Row label="GST" value={formatINR(payment.gstAmount)} />
                                <div className="border-t pt-2 flex justify-between">
                                    <span className="font-medium">Total Paid</span>
                                    <span className="font-bold text-green-700">
                                        {formatINR(payment.totalAmount)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ============================================================
   Small helpers
============================================================ */
function SummaryCard({
    label,
    value,
    accent = "text-gray-900",
}: {
    label: string;
    value: string;
    accent?: string;
}) {
    return (
        <div className="border rounded-lg bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-gray-500">
                {label}
            </div>
            <div className={`text-xl font-semibold mt-1 ${accent}`}>{value}</div>
        </div>
    );
}

function Row({
    label,
    value,
    mono,
    capitalize,
}: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    capitalize?: boolean;
}) {
    return (
        <div className="flex justify-between gap-3">
            <span className="text-gray-500">{label}</span>
            <span
                className={`text-right ${mono ? "font-mono text-xs" : ""} ${capitalize ? "capitalize" : ""
                    }`}
            >
                {value}
            </span>
        </div>
    );
}