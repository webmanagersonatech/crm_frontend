"use client";

import { useEffect, useState } from "react";
import { getFeeConfigurationByAdmin, createManualPayment } from "@/app/lib/request/feeconfigurationRoutes";
import { toast } from "react-toastify";

interface ManualPaymentDialogProps {
    open: boolean;
    studentId: string | null;
    onClose: () => void;
    onSuccess?: () => void;
}

interface GivenAmountEntry {
    date: string;
    amount: number;
    description: string;
}

interface GivenAmountRecord {
    amount: number;
    entries: GivenAmountEntry[];
}

interface Installment {
    number: number;
    originalAmount: number;
    tuitionFee: number;
    otherFee: number;
    tuitionConcession: number;
    otherFeeConcession: number;
    discountAmount: number;
    payableAmount: number;
    dueDate: string;
    paid: boolean;
    paidDate: string | null;
    paymentId: string | null;
    paymentOptionId: string;
    name?: string;
    type?: string;
    paymentAmount?: number;
}

interface YearData {
    year: string;
    originalAmount: number;
    tuitionFee: number;
    otherFee: number;
    concessionPercentage: number;
    tuitionConcession: number;
    otherFeeConcession: number;
    concessionAmount: number;
    payableAmount: number;
    paymentMethod: string;
    paymentOptions: Installment[];
}

interface FeeData {
    studentId: string;
    studentName: string;
    programId: string;
    courseName: string;
    paymentMethod: string;
    initialPaymentType: string;
    unpaidYears: number[];
    givenAmount?: number;
    givenAmountEntries?: GivenAmountRecord[];
    feeConcession: {
        referralIds: string[];
        matchedReferrals: Array<{
            referralId: string;
            name: string;
            percentage: number;
        }>;
        concessionPercentage: number;
        appliedOn?: string;
    };
    years: YearData[];
}

export default function ManualPaymentDialog({
    open,
    studentId,
    onClose,
    onSuccess,
}: ManualPaymentDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feeData, setFeeData] = useState<FeeData | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedInstallment, setSelectedInstallment] = useState<number>(0);
    const [selectedPaymentOptionId, setSelectedPaymentOptionId] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [transactionId, setTransactionId] = useState<string>("");
    const [selectedUnpaidYear, setSelectedUnpaidYear] = useState<number | null>(null);
    const [remarks, setRemarks] = useState<string>("");
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'full_payment' | 'installment'>('full_payment');
    const [isSelectedPaid, setIsSelectedPaid] = useState<boolean>(false);

    // Fetch fee data with payment method
    const fetchFeeConfiguration = async (paymentMethod?: string) => {
        if (!studentId) return;

        try {
            setLoading(true);
            const data = await getFeeConfigurationByAdmin(studentId, paymentMethod, selectedUnpaidYear);
            setFeeData(data);

            if (data?.initialPaymentType) {
                setSelectedPaymentMethod(
                    data.initialPaymentType === "installment"
                        ? "installment"
                        : "full_payment"
                );
            }

            if (data?.years?.length > 0) {
                const firstYear = data.years[0];
                setSelectedYear(firstYear.year);

                const firstUnpaid = firstYear.paymentOptions?.find(
                    (opt: Installment) => !opt.paid
                );
                if (firstUnpaid) {
                    setSelectedInstallment(firstUnpaid.number);
                    setSelectedPaymentOptionId(firstUnpaid.paymentOptionId);
                    setAmount(firstUnpaid.payableAmount.toString());
                    setIsSelectedPaid(false);
                } else {
                    const firstOption = firstYear.paymentOptions?.[0];
                    if (firstOption) {
                        setSelectedInstallment(firstOption.number);
                        setSelectedPaymentOptionId(firstOption.paymentOptionId);
                        setAmount(firstOption.payableAmount.toString());
                        setIsSelectedPaid(true);
                    }
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to load fee details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open || !studentId) return;
        fetchFeeConfiguration();
    }, [open, studentId, selectedUnpaidYear]);

    useEffect(() => {
        if (!feeData) return;

        const yearData = feeData.years.find(y => y.year === selectedYear);
        if (!yearData) return;

        const installment = yearData.paymentOptions?.find(
            (opt: Installment) => opt.number === selectedInstallment
        );
        if (installment) {
            setSelectedPaymentOptionId(installment.paymentOptionId);
            setAmount(installment.payableAmount.toString());
            setIsSelectedPaid(installment.paid || false);
        }
    }, [selectedYear, selectedInstallment, feeData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!feeData || !studentId) {
            toast.error("Missing required data");
            return;
        }

        if (isSelectedPaid) {
            toast.error("This installment has already been paid");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (!transactionId.trim()) {
            toast.error("Please enter a transaction ID");
            return;
        }

        if (!selectedPaymentOptionId) {
            toast.error("Payment option not selected");
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                studentId: studentId,
                year: selectedYear,
                installmentNumber: selectedInstallment,
                paymentOptionId: selectedPaymentOptionId,
                amount: parseFloat(amount),
                transactionId: transactionId.trim(),
                paymentDate: paymentDate,
                remarks: remarks.trim() || undefined,
            };

            const response = await createManualPayment(payload);

            if (response.success) {
                toast.success(response.message || "Payment recorded successfully!");
                await fetchFeeConfiguration(selectedPaymentMethod);

                if (onSuccess) {
                    onSuccess();
                }

                setTransactionId('');
                setRemarks('');
                setPaymentDate(new Date().toISOString().split('T')[0]);

                if (feeData.years?.length > 0) {
                    const firstYear = feeData.years[0];
                    const nextUnpaid = firstYear.paymentOptions?.find(
                        (opt: Installment) => !opt.paid && opt.number !== selectedInstallment
                    );
                    if (nextUnpaid) {
                        setSelectedInstallment(nextUnpaid.number);
                        setSelectedPaymentOptionId(nextUnpaid.paymentOptionId);
                        setAmount(nextUnpaid.payableAmount.toString());
                        setIsSelectedPaid(false);
                    } else {
                        const firstOption = firstYear.paymentOptions?.[0];
                        if (firstOption) {
                            setSelectedInstallment(firstOption.number);
                            setSelectedPaymentOptionId(firstOption.paymentOptionId);
                            setAmount(firstOption.payableAmount.toString());
                            setIsSelectedPaid(true);
                        }
                    }
                }
            } else {
                toast.error(response.message || "Failed to record payment");
            }

        } catch (error: any) {
            console.error("Manual payment error:", error);

            if (error.response?.status === 400) {
                toast.error(error.response?.data?.message || "Invalid request. Please check the data.");
            } else if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
            } else if (error.response?.status === 403) {
                toast.error("You don't have permission to perform this action.");
            } else if (error.response?.status === 404) {
                toast.error("Student or fee configuration not found.");
            } else {
                toast.error(error?.response?.data?.message || error.message || "Failed to record payment");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handlePaymentMethodToggle = async (method: 'full_payment' | 'installment') => {
        setSelectedPaymentMethod(method);
        await fetchFeeConfiguration(method);
    };

    const isDueDatePassed = (dueDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => {
        if (!amount) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Payment History</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading fee details...</p>
                    </div>
                ) : feeData ? (
                    <div>
                        {/* Student Info Row */}
                        <div className="mb-5 flex flex-wrap gap-6 border-b pb-4">
                            <div>
                                <p className="text-xs text-gray-500">Student ID</p>
                                <p className="font-semibold text-gray-800">{feeData.studentId}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Student Name</p>
                                <p className="font-semibold text-gray-800">{feeData.studentName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Course</p>
                                <p className="font-semibold text-gray-800">{feeData.courseName}</p>
                            </div>
                        </div>

                        {/* Fee Concession */}
                        {feeData.feeConcession?.concessionPercentage > 0 && (
                            <div className="mb-5 bg-green-50 border border-green-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
                                <span className="text-sm font-medium text-green-800">Fee Concession Applied:</span>
                                {feeData.feeConcession.matchedReferrals?.map((referral, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        {referral.name} ({referral.percentage}%)
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Year Selection */}
                        {(feeData.unpaidYears?.length ?? 0) > 0 && (
                            <div className="mb-5">
                                <div className="mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900">Fee Year</h3>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Select a year to view fees</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {feeData.unpaidYears.map((year) => {
                                        const isSelected = selectedUnpaidYear === year;
                                        return (
                                            <button
                                                key={year}
                                                type="button"
                                                onClick={() => setSelectedUnpaidYear(year)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${isSelected
                                                    ? "border-blue-600 bg-blue-50 text-blue-700"
                                                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50"
                                                }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-blue-600" : "bg-orange-500"}`} />
                                                <span className="text-xs font-semibold">Year {year}</span>
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUnpaidYear(null)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${selectedUnpaidYear === null
                                            ? "border-green-600 bg-green-50 text-green-700"
                                            : "border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50"
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${selectedUnpaidYear === null ? "bg-green-600" : "bg-gray-400"}`} />
                                        <span className="text-xs font-semibold">Current Year</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Fee Structure - Single Page Table View */}
                        <div className="mb-6">
                            {feeData.years?.map((year: YearData, yearIndex: number) => (
                                <div key={yearIndex} className="mb-6">
                                    {/* Year Header */}
                                    <div className="flex flex-wrap justify-between items-center mb-3">
                                        <h3 className="text-lg font-semibold text-gray-800">Year {year.year}</h3>
                                        <div className="flex items-center gap-4 text-sm">
                                            {year.concessionPercentage > 0 && (
                                                <span className="text-green-600 font-medium">-{formatCurrency(year.concessionAmount)}</span>
                                            )}
                                            <span className="font-bold text-blue-600">
                                                Payable: {formatCurrency(year.payableAmount)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Installments Table */}
                                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 text-gray-600">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium">Installment</th>
                                                    <th className="px-4 py-3 text-left font-medium">Due Date</th>
                                                    <th className="px-4 py-3 text-right font-medium">Tuition</th>
                                                    <th className="px-4 py-3 text-right font-medium">Other</th>
                                                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {year.paymentOptions?.map((option: Installment) => {
                                                    const isPastDue = isDueDatePassed(option.dueDate);
                                                    const isPaid = option.paid;
                                                    const isSelected = selectedYear === year.year && selectedInstallment === option.number;

                                                    let label = '';
                                                    if (selectedPaymentMethod === 'full_payment') {
                                                        label = 'Full Payment';
                                                    } else if (selectedPaymentMethod === 'installment') {
                                                        label = `Installment ${option.number} of ${year.paymentOptions.length}`;
                                                    }

                                                    const tuitionDisplay = option.tuitionConcession > 0
                                                        ? option.tuitionFee - option.tuitionConcession
                                                        : option.tuitionFee;

                                                    return (
                                                        <tr
                                                            key={option.number}
                                                            className={`transition-colors ${isPaid
                                                                ? "bg-green-50/50"
                                                                : isPastDue
                                                                    ? "bg-red-50/50"
                                                                    : isSelected
                                                                        ? "bg-blue-50"
                                                                        : "hover:bg-gray-50"
                                                            } ${!isPaid ? "cursor-pointer" : "cursor-not-allowed"}`}
                                                            onClick={() => {
                                                                if (!isPaid) {
                                                                    setSelectedYear(year.year);
                                                                    setSelectedInstallment(option.number);
                                                                    setSelectedPaymentOptionId(option.paymentOptionId);
                                                                    setAmount(option.payableAmount.toString());
                                                                    setIsSelectedPaid(false);
                                                                } else {
                                                                    toast.info("This installment has already been paid");
                                                                }
                                                            }}
                                                        >
                                                            <td className="px-4 py-3 font-medium text-gray-800">{label}</td>
                                                            <td className="px-4 py-3 text-gray-600">
                                                                {new Date(option.dueDate).toLocaleDateString('en-IN', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                })}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-gray-700">
                                                                {formatCurrency(tuitionDisplay)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-gray-700">
                                                                {formatCurrency(option.otherFee)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                                {formatCurrency(option.payableAmount)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    {isPaid ? (
                                                                        <>
                                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800">
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                                Paid
                                                                            </span>
                                                                            {option.paidDate && (
                                                                                <span className="text-xs text-gray-500">
                                                                                    {formatDate(option.paidDate)}
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    ) : isPastDue ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                            </svg>
                                                                            Overdue
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                            Pending
                                                                        </span>
                                                                    )}
                                                                    {isSelected && !isPaid && (
                                                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                                                            Selected
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Paid Amount History */}
                        {(feeData.givenAmountEntries?.length ?? 0) > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Paid Amount History</h3>
                                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium">Date</th>
                                                <th className="px-4 py-3 text-left font-medium">Description</th>
                                                <th className="px-4 py-3 text-right font-medium">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {feeData.givenAmountEntries
                                                ?.flatMap((record) => record.entries)
                                                .map((entry, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-gray-600">
                                                            {new Date(entry.date).toLocaleDateString("en-IN", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                            })}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700">
                                                            {entry.description || "-"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                                                            {formatCurrency(entry.amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t border-gray-200">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700 text-right">
                                                    Total Paid Amount
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-600">
                                                    {formatCurrency(feeData.givenAmount || 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-gray-600">No fee configuration found for this student.</p>
                    </div>
                )}
            </div>
        </div>
    );
}