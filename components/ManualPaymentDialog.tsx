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
    paymentOptionId: string;  // ✅ Make sure this is included
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
    const [selectedPaymentOptionId, setSelectedPaymentOptionId] = useState<string>(""); // ✅ NEW: Track paymentOptionId
    const [amount, setAmount] = useState<string>("");
    const [transactionId, setTransactionId] = useState<string>("");
    const [remarks, setRemarks] = useState<string>("");
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'full_payment' | 'installment'>('full_payment');
    const [isSelectedPaid, setIsSelectedPaid] = useState<boolean>(false);

    // Fetch fee data with payment method
    const fetchFeeConfiguration = async (paymentMethod?: string) => {
        if (!studentId) return;

        try {
            setLoading(true);
            const data = await getFeeConfigurationByAdmin(studentId, paymentMethod);
            setFeeData(data);

            // Set initial payment method from data
            if (data?.initialPaymentType) {
                setSelectedPaymentMethod(
                    data.initialPaymentType === "installment"
                        ? "installment"
                        : "full_payment"
                );
            }

            // Auto-select first unpaid installment
            if (data?.years?.length > 0) {
                const firstYear = data.years[0];
                setSelectedYear(firstYear.year);

                // Find first unpaid option
                const firstUnpaid = firstYear.paymentOptions?.find(
                    (opt: Installment) => !opt.paid
                );
                if (firstUnpaid) {
                    setSelectedInstallment(firstUnpaid.number);
                    setSelectedPaymentOptionId(firstUnpaid.paymentOptionId); // ✅ Set paymentOptionId
                    setAmount(firstUnpaid.payableAmount.toString());
                    setIsSelectedPaid(false);
                } else {
                    const firstOption = firstYear.paymentOptions?.[0];
                    if (firstOption) {
                        setSelectedInstallment(firstOption.number);
                        setSelectedPaymentOptionId(firstOption.paymentOptionId); // ✅ Set paymentOptionId
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
    }, [open, studentId]);

    // Update amount and paid status when selection changes
    useEffect(() => {
        if (!feeData) return;

        const yearData = feeData.years.find(y => y.year === selectedYear);
        if (!yearData) return;

        const installment = yearData.paymentOptions?.find(
            (opt: Installment) => opt.number === selectedInstallment
        );
        if (installment) {
            setSelectedPaymentOptionId(installment.paymentOptionId); // ✅ Update paymentOptionId
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
                installmentNumber: selectedInstallment,  // ✅ Changed from installmentNo
                paymentOptionId: selectedPaymentOptionId, // ✅ ADDED: Send paymentOptionId
                amount: parseFloat(amount),
                transactionId: transactionId.trim(),
                paymentDate: paymentDate,
                remarks: remarks.trim() || undefined,
            };

            console.log("Sending payload:", payload); // Debug log

            const response = await createManualPayment(payload);

            if (response.success) {
                toast.success(response.message || "Payment recorded successfully!");

                // Refresh data
                await fetchFeeConfiguration(selectedPaymentMethod);

                if (onSuccess) {
                    onSuccess();
                }

                // Reset form
                setTransactionId('');
                setRemarks('');
                setPaymentDate(new Date().toISOString().split('T')[0]);

                // Auto-select next unpaid installment
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
                        // All paid
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Manual Payment</h2>
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
                    <form onSubmit={handleSubmit}>
                        {/* Student Info */}
                        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-xs text-gray-500">Student ID</p>
                                <p className="font-semibold text-gray-800">{feeData.studentId}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-xs text-gray-500">Student Name</p>
                                <p className="font-semibold text-gray-800">{feeData.studentName}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-xs text-gray-500">Course</p>
                                <p className="font-semibold text-gray-800">{feeData.courseName}</p>
                            </div>
                        </div>

                        {/* Fee Concession */}
                        {feeData.feeConcession?.concessionPercentage > 0 && (
                            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm sm:text-base font-semibold text-green-800">
                                            Fee Concession Applied: {feeData.feeConcession.concessionPercentage}% off
                                        </p>
                                        <p className="text-xs sm:text-sm text-green-700">
                                            {feeData.feeConcession.concessionPercentage}% discount on <strong>Tuition Fee</strong>
                                            {feeData.feeConcession.appliedOn && (
                                                <span className="ml-1 text-green-600 font-normal">
                                                    (applied only on tuition fee, other fee remains unchanged)
                                                </span>
                                            )}
                                        </p>
                                        {feeData.feeConcession.matchedReferrals && feeData.feeConcession.matchedReferrals.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {feeData.feeConcession.matchedReferrals.map((referral, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        {referral.name} ({referral.percentage}%)
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Payment Method Toggle */}
                        <div className="mb-6">
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <label className="text-sm font-medium text-gray-700">
                                            Payment Plan:
                                        </label>
                                        <div className="flex rounded-lg overflow-hidden border border-gray-300">
                                            <button
                                                type="button"
                                                onClick={() => handlePaymentMethodToggle('full_payment')}
                                                className={`px-4 py-2 text-sm font-medium transition-colors ${selectedPaymentMethod === 'full_payment'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                disabled={loading}
                                            >
                                                Full Payment
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePaymentMethodToggle('installment')}
                                                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${selectedPaymentMethod === 'installment'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                disabled={loading}
                                            >
                                                Installments
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {selectedPaymentMethod === 'full_payment'
                                            ? 'Pay the full amount at once'
                                            : 'Pay in multiple installments'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fee Structure */}
                        <div className="mb-6">
                            {feeData.years?.map((year: YearData, index: number) => (
                                <div
                                    key={index}
                                    className={`bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden ${selectedYear === year.year ? 'ring-2 ring-blue-500' : ''}`}
                                    onClick={() => {
                                        setSelectedYear(year.year);
                                        const firstUnpaid = year.paymentOptions?.find(
                                            (opt: Installment) => !opt.paid
                                        );
                                        if (firstUnpaid) {
                                            setSelectedInstallment(firstUnpaid.number);
                                            setSelectedPaymentOptionId(firstUnpaid.paymentOptionId);
                                            setAmount(firstUnpaid.payableAmount.toString());
                                            setIsSelectedPaid(false);
                                        } else {
                                            const firstOption = year.paymentOptions?.[0];
                                            if (firstOption) {
                                                setSelectedInstallment(firstOption.number);
                                                setSelectedPaymentOptionId(firstOption.paymentOptionId);
                                                setAmount(firstOption.payableAmount.toString());
                                                setIsSelectedPaid(true);
                                            }
                                        }
                                    }}
                                >
                                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                            <h2 className="text-lg font-semibold text-gray-800">
                                                Year {year.year}
                                            </h2>
                                            <div className="text-right">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                                                    <span className="text-xs text-gray-500">
                                                        Tuition: {formatCurrency(year.tuitionFee)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        Other: {formatCurrency(year.otherFee)}
                                                    </span>
                                                    {year.concessionPercentage > 0 && (
                                                        <span className="text-xs text-green-600 font-medium">
                                                            Save: {formatCurrency(year.concessionAmount)}
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-bold text-blue-600">
                                                        Payable: {formatCurrency(year.payableAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        {year.paymentOptions && year.paymentOptions.length > 0 ? (
                                            <div className="space-y-3">
                                                {year.paymentOptions.map((option: Installment, idx: number) => {
                                                    const isPastDue = isDueDatePassed(option.dueDate);
                                                    const isPaid = option.paid;
                                                    const isSelected = selectedYear === year.year && selectedInstallment === option.number;

                                                    let label = '';
                                                    if (selectedPaymentMethod === 'full_payment') {
                                                        label = 'Full Payment';
                                                    } else if (selectedPaymentMethod === 'installment') {
                                                        label = `Installment ${option.number} of ${year.paymentOptions.length}`;
                                                    }

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`p-4 rounded-lg border-2 transition-all ${isPaid
                                                                ? "bg-green-50 border-green-300 cursor-not-allowed opacity-75"
                                                                : isPastDue
                                                                    ? "bg-red-50 border-red-300"
                                                                    : isSelected
                                                                        ? "bg-blue-50 border-blue-500 shadow-md"
                                                                        : "bg-gray-50 border-gray-200 hover:border-blue-300 cursor-pointer"
                                                                }`}
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
                                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h3 className="text-base font-semibold text-gray-800">
                                                                            {label}
                                                                        </h3>
                                                                        {isPaid && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800">
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                                Paid
                                                                            </span>
                                                                        )}
                                                                        {!isPaid && isPastDue && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                                </svg>
                                                                                Overdue
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Due: {new Date(option.dueDate).toLocaleDateString('en-IN', {
                                                                            day: '2-digit',
                                                                            month: 'short',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </p>

                                                                    {!isPaid && (
                                                                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                                                                            <span className="text-gray-500">Tuition: {formatCurrency(option.tuitionFee)}</span>
                                                                            {option.tuitionConcession > 0 && (
                                                                                <span className="text-green-600">(-{formatCurrency(option.tuitionConcession)})</span>
                                                                            )}
                                                                            <span className="text-gray-500">Other: {formatCurrency(option.otherFee)}</span>
                                                                            {option.discountAmount > 0 && (
                                                                                <span className="text-green-600 font-medium">Save {formatCurrency(option.discountAmount)}</span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {isPaid && option.paidDate && (
                                                                        <p className="text-xs text-green-600 mt-1">
                                                                            Paid on: {formatDate(option.paidDate)}
                                                                        </p>
                                                                    )}
                                                                    {isPaid && option.paymentId && (
                                                                        <p className="text-xs text-gray-400 truncate">
                                                                            Payment ID: {option.paymentId}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    <div className="text-right">
                                                                        {option.discountAmount > 0 && !isPaid && (
                                                                            <p className="text-xs text-gray-400 line-through">
                                                                                {formatCurrency(option.originalAmount)}
                                                                            </p>
                                                                        )}
                                                                        <p className={`text-lg font-bold ${isPaid ? 'text-green-600' : 'text-gray-800'}`}>
                                                                            {formatCurrency(option.payableAmount)}
                                                                        </p>
                                                                    </div>
                                                                    {isSelected && !isPaid && (
                                                                        <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                                                            Selected
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-gray-500">
                                                No payment options available.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Payment Details Form */}
                        <div className="border-t border-gray-200 pt-6 mt-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h3>

                            {isSelectedPaid ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className="text-sm font-medium text-yellow-800">
                                            This installment has already been paid. Payment details are disabled.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Amount to Pay *
                                        </label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="Enter amount"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                            required
                                            min="0"
                                            step="0.01"
                                            disabled={true}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Amount is auto-calculated based on selected installment
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Transaction ID *
                                        </label>
                                        <input
                                            type="text"
                                            value={transactionId}
                                            onChange={(e) => setTransactionId(e.target.value)}
                                            placeholder="Enter transaction ID (e.g., UPI reference, bank ref no.)"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Payment Date
                                        </label>
                                        <input
                                            type="date"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Remarks
                                        </label>
                                        <input
                                            type="text"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="Add remarks (optional)"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Summary */}
                        <div className="mb-6 mt-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Summary</h3>
                            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Year</p>
                                    <p className="font-semibold text-gray-800">{selectedYear || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Option</p>
                                    <p className="font-semibold text-gray-800">
                                        {selectedPaymentMethod === 'full_payment' ? 'Full Payment' : `Installment ${selectedInstallment}`}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Amount</p>
                                    <p className={`font-semibold text-lg ${isSelectedPaid ? 'text-gray-500' : 'text-green-600'}`}>
                                        {formatCurrency(parseFloat(amount) || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Status</p>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isSelectedPaid
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {isSelectedPaid ? 'Paid' : 'Pending Payment'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={submitting || isSelectedPaid}
                            >
                                {submitting ? (
                                    <>
                                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Record Payment
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
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