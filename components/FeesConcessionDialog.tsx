"use client";

import { X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getOverallReferralsByInstitute } from "@/app/lib/request/studentRequest";
import { createFeeConcessionRequest } from "@/app/lib/request/feeConcessionRequest";

interface FeesConcessionDialogProps {
  open: boolean;
  studentId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StudentData {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  instituteId: string;
  studentId: string;
  programId: string;
  id: string;
}

interface PaymentOption {
  name: string;
  value: string;
}

interface CourseFeeData {
  courseId: string;
  courseName: string;
  years: Array<{
    year: string;
    totalAmount: number;
    tuitionFee: number;
    otherFee: number;
    paymentOptions: PaymentOption[];
  }>;
}

interface ReferralData {
  referralId: string;
  name: string;
  percentage: number;
}

interface FeeConcessionData {
  _id: string;
  reason: string;
  referralIds: string[];
  counsellorName: string;
  paymentOptionId?: string;
}

export default function FeesConcessionDialog({
  open,
  studentId,
  onClose,
  onSuccess,
}: FeesConcessionDialogProps) {
  const [reason, setReason] = useState("");
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [selectedReferrals, setSelectedReferrals] = useState<string[]>([]);
  const [counsellorName, setCounsellorName] = useState("");
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<string>("");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [courseFeeData, setCourseFeeData] = useState<CourseFeeData | null>(null);
  const [feeConcession, setFeeConcession] = useState<FeeConcessionData | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && studentId) {
      loadReferrals();
    } else {
      resetForm();
    }
  }, [open, studentId]);

  const resetForm = () => {
    setReason("");
    setSelectedReferrals([]);
    setCounsellorName("");
    setSelectedPaymentOption("");
    setFeeConcession(null);
  };

  const loadReferrals = async () => {
    try {
      setReferralLoading(true);
      const res = await getOverallReferralsByInstitute(studentId as string);

      if (res?.data) {
        setStudentData(res.data);
      }

      if (res?.courseFee) {
        setCourseFeeData(res.courseFee);
      }

      setReferrals(res?.referrals || []);

      if (res?.feeConcession) {
        setFeeConcession(res.feeConcession);

        if (res.feeConcession.reason) {
          setReason(res.feeConcession.reason);
        }

        if (res.feeConcession.counsellorName) {
          setCounsellorName(res.feeConcession.counsellorName);
        }

        if (res.feeConcession.paymentOptionId) {
          setSelectedPaymentOption(res.feeConcession.paymentOptionId);
        }

        if (res.feeConcession.referralIds && res.feeConcession.referralIds.length > 0) {
          const validReferralIds = res.feeConcession.referralIds.filter((id: any) =>
            res.referrals?.some((r: ReferralData) => r.referralId === id)
          );
          setSelectedReferrals(validReferralIds);
        }
      } else {
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load referrals");
      resetForm();
    } finally {
      setReferralLoading(false);
    }
  };

  const handleReferralToggle = (referralId: string) => {
    setSelectedReferrals((prev) =>
      prev.includes(referralId)
        ? prev.filter((id) => id !== referralId)
        : [...prev, referralId]
    );
  };

  const calculateTotalDiscount = () => {
    let totalPercentage = 0;
    selectedReferrals.forEach((id) => {
      const referral = referrals.find((r) => r.referralId === id);
      if (referral) {
        totalPercentage += referral.percentage;
      }
    });
    return totalPercentage;
  };

  const calculateDiscountedAmount = () => {
    const firstYear = courseFeeData?.years?.[0];
    
    if (!firstYear) {
      return {
        originalAmount: 0,
        tuitionFee: 0,
        otherFee: 0,
        discountAmount: 0,
        finalAmount: 0,
        percentage: 0,
        discountedTuition: 0
      };
    }

    const tuitionFee = firstYear.tuitionFee || 0;
    const otherFee = firstYear.otherFee || 0;
    const totalOriginal = tuitionFee + otherFee;
    
    const discountPercentage = calculateTotalDiscount();
    const discountAmount = (tuitionFee * discountPercentage) / 100;
    const discountedTuition = tuitionFee - discountAmount;
    const finalAmount = discountedTuition + otherFee;

    return {
      originalAmount: totalOriginal,
      tuitionFee: tuitionFee,
      otherFee: otherFee,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      percentage: discountPercentage,
      discountedTuition: discountedTuition
    };
  };

  const handleSubmit = async () => {
    // Validation
    if (!counsellorName.trim()) {
      toast.error("Counsellor name is required");
      return;
    }

    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    if (selectedReferrals.length === 0) {
      toast.error("Select at least one referral");
      return;
    }

    try {
      setLoading(true);

      // Build payload - only include paymentOptionId if selected
      const payload: any = {
        studentId: studentId as string,
        reason: reason.trim(),
        referralIds: selectedReferrals,
        counsellorName: counsellorName.trim(),
      };

      // Only add paymentOptionId if it's selected (has value)
      if (selectedPaymentOption && selectedPaymentOption.trim() !== "") {
        payload.paymentOptionId = selectedPaymentOption;
      }

      await createFeeConcessionRequest(payload);

      toast.success(
        feeConcession?._id
          ? "Fees concession updated successfully"
          : "Fees concession saved successfully"
      );

      resetForm();

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error("Error creating fee concession:", error);
      toast.error(error.message || "Failed to save concession");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const discountInfo = calculateDiscountedAmount();
  const totalDiscountPercentage = calculateTotalDiscount();
  const paymentOptions = courseFeeData?.years?.[0]?.paymentOptions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          {feeConcession?._id ? "Edit Fees Concession" : "Fees Concession"}
        </h2>

        <div className="space-y-4">
          {/* Student Details Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-3">Student Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Name</label>
                <p className="font-medium">
                  {studentData?.firstname} {studentData?.lastname}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Student ID</label>
                <p className="font-medium">{studentData?.studentId || studentId}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Email</label>
                <p className="font-medium">{studentData?.email || "N/A"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Program</label>
                <p className="font-medium">{studentData?.programId || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Fee Details Section */}
          {courseFeeData && courseFeeData.years && courseFeeData.years.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">Fee Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Course:</span>
                  <span className="font-medium">{courseFeeData.courseName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Tuition Fee:</span>
                  <span className="font-medium">
                    ₹{discountInfo.tuitionFee.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Other Fee:</span>
                  <span className="font-medium text-gray-700">
                    ₹{discountInfo.otherFee.toLocaleString()}
                  </span>
                </div>
                
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Fee:</span>
                    <span className="font-medium">
                      ₹{discountInfo.originalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedReferrals.length > 0 && (
                  <div className="mt-3 pt-3 border-t-2 border-blue-300">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Tuition Fee Discount ({totalDiscountPercentage}%):
                      </span>
                      <span className="text-green-600 font-medium">
                        -₹{discountInfo.discountAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discounted Tuition Fee:</span>
                      <span className="text-green-700 font-medium">
                        ₹{discountInfo.discountedTuition.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Other Fee (No Discount):</span>
                      <span className="text-gray-700 font-medium">
                        ₹{discountInfo.otherFee.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-blue-300">
                      <span className="text-gray-700">Final Amount:</span>
                      <span className="text-purple-600">
                        ₹{discountInfo.finalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Option Selection - OPTIONAL */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Select Payment Option <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            
            {paymentOptions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {paymentOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedPaymentOption === option.value
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPaymentOption === option.value}
                      onChange={() => {
                        // Toggle: if already selected, deselect; otherwise select this one
                        setSelectedPaymentOption(
                          selectedPaymentOption === option.value ? "" : option.value
                        );
                      }}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="font-medium">{option.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-2 border rounded-md">
                No payment options available
              </p>
            )}
            
            <p className="text-xs text-gray-400 mt-1">
              * Optional: Select payment option only if you want to specify the installment plan
            </p>
          </div>

          {/* Referrals Section - Multi Select */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Select Referrals (Multiple) <span className="text-red-500">*</span>
            </label>

            {referralLoading ? (
              <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                <Loader2 className="animate-spin w-4 h-4" />
                Loading referrals...
              </div>
            ) : (
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {referrals.length > 0 ? (
                  referrals.map((item) => (
                    <label
                      key={item.referralId}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedReferrals.includes(item.referralId)}
                        onChange={() => handleReferralToggle(item.referralId)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="flex-1">{item.name}</span>
                      <span className="text-sm text-purple-600 font-medium">
                        {item.percentage}%
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-2">
                    No referrals available
                  </p>
                )}
              </div>
            )}

            {selectedReferrals.length > 0 && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {selectedReferrals.map((id) => {
                    const referral = referrals.find((r) => r.referralId === id);
                    return referral ? (
                      <span
                        key={id}
                        className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        {referral.name} ({referral.percentage}%)
                        <button
                          onClick={() => handleReferralToggle(id)}
                          className="hover:text-purple-900 ml-1"
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Total Discount:{" "}
                  <span className="font-bold text-purple-600">
                    {totalDiscountPercentage}%
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    (applied only to tuition fee)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Counsellor Name - Required */}
          <div>
            <label className="text-sm font-medium block mb-1">
              Counsellor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter counsellor name"
              value={counsellorName}
              onChange={(e) => setCounsellorName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Reason - Required */}
          <div>
            <label className="text-sm font-medium block mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Enter reason for concession"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              rows={3}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                {feeConcession?._id ? "Updating..." : "Saving..."}
              </>
            ) : (
              feeConcession?._id ? "Update Concession" : "Save Concession"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}