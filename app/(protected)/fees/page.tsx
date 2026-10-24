"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import Select from "react-select";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import {
  saveFeeConfiguration,
  getFeeConfigurationByInstitute,
  FeeConfiguration,
} from "@/app/lib/request/feeconfigurationRoutes";
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest";
import { FaCreditCard, FaTimes } from "react-icons/fa";

/* -------------------- Types -------------------- */

interface OptionType {
  value: string;
  label: string;
}

interface InstallmentDetail {
  number: number;
  amount: number;
  tuitionFee: number;
  otherFee: number;
  dueDate: string;
}

interface PaymentOption {
  paymentOptionId: string;
  name: string;
  type: "full_payment" | "installment";
  installments: InstallmentDetail[];
}

interface YearFee {
  year: string;
  amount: number;
  tuitionFee: number;
  otherFee: number;
  otherFeeDescription?: string;
  paymentOptions: PaymentOption[];
}

interface CourseFee {
  courseId: string;
  courseName: string;
  years: YearFee[];
}

interface ReferralType {
  referralId: string;
  name: string;
  percentage: number;
}

interface FeeStructure {
  instituteId: string;
  instituteName: string;
  logo: string;
  courses: CourseFee[];
  referrals: ReferralType[];
}

interface PopupPlan {
  count: number;
  amounts: number[];
  tuitionFees: number[];
  otherFees: number[];
  dueDates: string[];
}

/* -------------------- Constants -------------------- */

const INSTALLMENT_COUNT_OPTIONS = [2, 3, 4, 5, 6];

/* -------------------- Helpers -------------------- */

const todayStr = () => new Date().toISOString().split("T")[0];

function generateAcademicYearOptions(range = 3): string[] {
  const now = new Date();
  const currentStart =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const years: string[] = [];
  for (let i = -range; i <= range; i++) {
    const start = currentStart + i;
    years.push(`${start}-${start + 1}`);
  }
  return years;
}

function getDefaultAcademicYear(): string {
  const now = new Date();
  const currentStart =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${currentStart}-${currentStart + 1}`;
}

function formatDateForInput(dateString: string): string {
  if (!dateString) return todayStr();
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return todayStr();
    return date.toISOString().split("T")[0];
  } catch {
    return todayStr();
  }
}

function generateReferralId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getYearDisplay(year: string): string {
  const num = parseInt(year);
  if (num === 1) return "1st Year";
  if (num === 2) return "2nd Year";
  if (num === 3) return "3rd Year";
  if (num === 4) return "4th Year";
  return `${year}th Year`;
}

function calculateFeeComponents(totalAmount: number) {
  const tuitionPercentage = 0.7;
  return {
    tuitionFee: Math.round(totalAmount * tuitionPercentage),
    otherFee: Math.round(totalAmount * (1 - tuitionPercentage)),
  };
}

const formatCurrency = (n: number | string) => {
  const num = Number(n);
  if (!num || isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

/* -------------------- Component -------------------- */

export default function FeeStructurePage() {
  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [selectedInstitute, setSelectedInstitute] =
    useState<OptionType | null>(null);

  const [academicYear, setAcademicYear] = useState<string>("");
  const [academicYearOptions, setAcademicYearOptions] = useState<OptionType[]>(
    []
  );

  const [feeStructure, setFeeStructure] = useState<FeeStructure>({
    instituteId: "",
    instituteName: "",
    logo: "",
    courses: [],
    referrals: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [commonAmount, setCommonAmount] = useState<number | "">("");
  const [institute, setInstitute] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 🔹 Flag: the year has no config on the server yet
  const [configExistsForYear, setConfigExistsForYear] = useState(false);

  // Referral form
  const [referralName, setReferralName] = useState("");
  const [referralPercentage, setReferralPercentage] = useState<number | "">(
    ""
  );
  const [editingReferralIndex, setEditingReferralIndex] = useState<
    number | null
  >(null);

  // Payment popup
  const [installmentPopup, setInstallmentPopup] = useState<{
    isOpen: boolean;
    courseId: string;
    yearIndex: number;
    amount: number;
    tuitionFee: number;
    otherFee: number;
    otherFeeDescription?: string;
    fullPaymentDueDate: string;
    plans: PopupPlan[];
  } | null>(null);

  // 🔹 Request-id ref for race condition protection
  const fetchSeqRef = useRef(0);

  const inputClass =
    "border rounded px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none";

  /* -------------------- Builders -------------------- */

  const buildFullPaymentOption = (
    amount: number,
    tuitionFee: number,
    otherFee: number,
    dueDate: string,
    instituteId: string
  ): PaymentOption => ({
    paymentOptionId: `${instituteId}-FULL`,
    name: "Full Payment",
    type: "full_payment",
    installments: [{ number: 1, amount, tuitionFee, otherFee, dueDate }],
  });

  const buildInstallmentOption = (
    count: number,
    totalAmount: number,
    totalTuition: number,
    totalOther: number,
    amounts: number[],
    dueDates: string[],
    instituteId: string,
    tuitionFees?: number[],
    otherFees?: number[]
  ): PaymentOption => {
    const installments: InstallmentDetail[] = amounts.map((amt, idx) => {
      let tuition: number;
      let other: number;

      if (
        tuitionFees &&
        tuitionFees[idx] !== undefined &&
        tuitionFees[idx] >= 0
      ) {
        tuition = tuitionFees[idx];
        other = amt - tuition;
      } else if (
        otherFees &&
        otherFees[idx] !== undefined &&
        otherFees[idx] >= 0
      ) {
        other = otherFees[idx];
        tuition = amt - other;
      } else {
        tuition = Math.round((amt / totalAmount) * totalTuition);
        other = amt - tuition;
      }

      return {
        number: idx + 1,
        amount: amt,
        tuitionFee: tuition,
        otherFee: other,
        dueDate: dueDates[idx] || todayStr(),
      };
    });

    return {
      paymentOptionId: `${instituteId}-INSTALLMENT-${count}`,
      name: `${count} Installments`,
      type: "installment",
      installments,
    };
  };

  /* -------------------- Effects -------------------- */

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Init academic year options (runs once)
  useEffect(() => {
    const opts = generateAcademicYearOptions(3).map((y) => ({
      value: y,
      label: y,
    }));
    setAcademicYearOptions(opts);
    setAcademicYear(getDefaultAcademicYear());
  }, []);

  // Decode token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload = token.split(".")[1];
      const decoded: any = JSON.parse(atob(payload));
      setRole(decoded.role);
      if (decoded?.instituteId) setInstitute(decoded.instituteId);
    } catch {
      console.error("Token decode error");
    }
  }, []);

  // Fetch institutions
  useEffect(() => {
    if (!role) return;

    const fetchInstitutions = async () => {
      try {
        setIsLoading(true);
        const res = await getActiveInstitutions();

        if (res && res.length > 0) {
          const opts = res.map((inst: any) => ({
            value: inst.instituteId,
            label: inst.name,
          }));
          setInstitutions(opts);

          if (role !== "superadmin" && institute) {
            const found = opts.find((i: any) => i.value === institute);
            if (found) {
              setSelectedInstitute(found);
            } else {
              setSelectedInstitute({ value: institute, label: institute });
              toast.warning("Institute name not found, using ID as label");
            }
          }
        } else {
          toast.warning("No institutions found");
        }
      } catch (error) {
        console.error("Failed to fetch institutions:", error);
        toast.error("Failed to load institutions");
        if (role !== "superadmin" && institute) {
          setSelectedInstitute({ value: institute, label: institute });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstitutions();
  }, [role, institute]);

  // 🔹 Fetch fee structure (per institute + academic year) with race guard
  useEffect(() => {
    if (!selectedInstitute || !academicYear) {
      setFeeStructure({
        instituteId: "",
        instituteName: "",
        logo: "",
        courses: [],
        referrals: [],
      });
      setCommonAmount("");
      setIsDataLoaded(false);
      setConfigExistsForYear(false);
      return;
    }

    // 🆕 Bump the request sequence — any older in-flight fetch becomes stale
    const mySeq = ++fetchSeqRef.current;

    const fetchFeeStructure = async () => {
      try {
        setIsLoading(true);
        setIsDataLoaded(false);

        // -------- 1) Year-specific fee config --------
        let feeConfigResponse: any = null;
        try {
          feeConfigResponse = await getFeeConfigurationByInstitute(
            selectedInstitute.value,
            academicYear
          );
        } catch (err) {
          console.log(`No fee config for ${academicYear}`);
        }

        // Race check
        if (fetchSeqRef.current !== mySeq) return;

        const configExists = !!feeConfigResponse?.exists;
        setConfigExistsForYear(configExists);

        const feeConfigData = configExists ? feeConfigResponse.data : null;

        // -------- 2) Settings (courses, years, logo, referrals) --------
        const settingsData = await getSettingsByInstitute(
          selectedInstitute.value
        );

        // Race check
        if (fetchSeqRef.current !== mySeq) return;

        const totalYears = settingsData.courseYears || 0;
        const yearLabels = Array.from({ length: totalYears }, (_, i) =>
          String(i + 1)
        );

        let coursesWithFees: CourseFee[] = [];

        if (settingsData.courses && settingsData.courses.length > 0) {
          const feeMap = new Map<
            string,
            Map<
              string,
              {
                amount: number;
                tuitionFee: number;
                otherFee: number;
                otherFeeDescription?: string;
                paymentOptions: PaymentOption[];
              }
            >
          >();

          if (feeConfigData?.courseFeeStructure) {
            feeConfigData.courseFeeStructure.forEach((feeCourse: any) => {
              const years = feeCourse.years || [];
              const yearMap = new Map();
              years.forEach((yearFee: any) => {
                const yearStr = String(yearFee.year);

                const paymentOptions: PaymentOption[] = (
                  yearFee.paymentOptions || []
                ).map((opt: any) => {
                  const installments = (opt.installments || []).map(
                    (inst: any) => ({
                      number: inst.number,
                      amount: inst.amount || 0,
                      tuitionFee: inst.tuitionFee || 0,
                      otherFee: inst.otherFee || 0,
                      dueDate: formatDateForInput(inst.dueDate),
                    })
                  );

                  return {
                    paymentOptionId:
                      opt.paymentOptionId ||
                      `${selectedInstitute.value}-${
                        opt.type === "full_payment"
                          ? "FULL"
                          : `INSTALLMENT-${installments.length}`
                      }`,
                    name:
                      opt.name ||
                      (opt.type === "full_payment"
                        ? "Full Payment"
                        : `${installments.length} Installments`),
                    type:
                      opt.type === "full_payment"
                        ? "full_payment"
                        : "installment",
                    installments,
                  } as PaymentOption;
                });

                yearMap.set(yearStr, {
                  amount: yearFee.amount || 0,
                  tuitionFee: yearFee.tuitionFee || 0,
                  otherFee: yearFee.otherFee || 0,
                  otherFeeDescription: yearFee.otherFeeDescription || "",
                  paymentOptions,
                });
              });
              feeMap.set(feeCourse.courseId, yearMap);
            });
          }

          coursesWithFees = settingsData.courses.map((course: any) => {
            const courseFeeMap = feeMap.get(course.courseId);

            return {
              courseId: course.courseId || "",
              courseName: course.name || "",
              years: yearLabels.map((year) => {
                const yearData = courseFeeMap?.get(year);
                const amount = yearData?.amount || 0;
                const tuitionFee = yearData?.tuitionFee || 0;
                const otherFee = yearData?.otherFee || 0;
                const otherFeeDescription =
                  yearData?.otherFeeDescription || "";
                let paymentOptions = yearData?.paymentOptions || [];

                if (paymentOptions.length === 0 && amount > 0) {
                  paymentOptions = [
                    buildFullPaymentOption(
                      amount,
                      tuitionFee,
                      otherFee,
                      todayStr(),
                      selectedInstitute.value
                    ),
                  ];
                }

                return {
                  year,
                  amount,
                  tuitionFee,
                  otherFee,
                  otherFeeDescription,
                  paymentOptions,
                };
              }),
            };
          });
        }

        // -------- 3) Referrals --------
        let referrals: ReferralType[] = [];
        if (
          feeConfigData?.referrals &&
          feeConfigData.referrals.length > 0
        ) {
          referrals = feeConfigData.referrals.map((ref: any) => ({
            referralId: ref.referralId || generateReferralId(),
            name: ref.name || "",
            percentage: ref.percentage || 0,
          }));
        } else if (
          settingsData.referrals &&
          settingsData.referrals.length > 0
        ) {
          referrals = settingsData.referrals.map((ref: any) => ({
            referralId: generateReferralId(),
            name: ref.name || "",
            percentage: ref.percentage || 0,
          }));
        }

        // Race check before committing state
        if (fetchSeqRef.current !== mySeq) return;

        setFeeStructure({
          instituteId: selectedInstitute.value,
          instituteName: selectedInstitute.label,
          logo: settingsData.logo || "",
          courses: coursesWithFees,
          referrals,
        });

        setCommonAmount("");
        setIsDataLoaded(true);
      } catch (error: any) {
        if (fetchSeqRef.current !== mySeq) return;
        console.error("Failed to fetch fee structure:", error);
        toast.error(error.message || "Failed to load fee structure");
        setIsDataLoaded(true);
      } finally {
        if (fetchSeqRef.current === mySeq) setIsLoading(false);
      }
    };

    fetchFeeStructure();
  }, [selectedInstitute, academicYear]);

  /* -------------------- Payment popup -------------------- */

  const openInstallmentPopup = (courseId: string, yearIndex: number) => {
    const course = feeStructure.courses.find((c) => c.courseId === courseId);
    if (!course) return;
    const year = course.years[yearIndex];
    if (!year || year.amount <= 0) return;

    const fullOption = year.paymentOptions.find(
      (opt) => opt.type === "full_payment"
    );
    const installmentOptions = year.paymentOptions.filter(
      (opt) => opt.type === "installment"
    );

    const plans: PopupPlan[] = installmentOptions
      .map((opt) => ({
        count: opt.installments.length,
        amounts: opt.installments.map((i) => i.amount),
        tuitionFees: opt.installments.map((i) => i.tuitionFee),
        otherFees: opt.installments.map((i) => i.otherFee),
        dueDates: opt.installments.map((i) => formatDateForInput(i.dueDate)),
      }))
      .sort((a, b) => a.count - b.count);

    setInstallmentPopup({
      isOpen: true,
      courseId,
      yearIndex,
      amount: year.amount,
      tuitionFee: year.tuitionFee,
      otherFee: year.otherFee,
      otherFeeDescription: year.otherFeeDescription || "",
      fullPaymentDueDate: fullOption
        ? formatDateForInput(fullOption.installments[0]?.dueDate)
        : todayStr(),
      plans,
    });
  };

  const closeInstallmentPopup = () => setInstallmentPopup(null);

  const togglePlan = (count: number) => {
    if (!installmentPopup) return;
    const exists = installmentPopup.plans.some((p) => p.count === count);

    if (exists) {
      setInstallmentPopup((prev) =>
        prev
          ? { ...prev, plans: prev.plans.filter((p) => p.count !== count) }
          : prev
      );
      return;
    }

    const amount = installmentPopup.amount;
    const base = Math.floor(amount / count);
    const amounts = Array.from({ length: count }, (_, i) =>
      i === count - 1 ? amount - base * (count - 1) : base
    );
    const dueDates = Array.from({ length: count }, () => todayStr());
    const tuitionFees = amounts.map((amt) =>
      Math.round((amt / amount) * installmentPopup.tuitionFee)
    );
    const otherFees = amounts.map((amt, idx) => amt - tuitionFees[idx]);

    setInstallmentPopup((prev) =>
      prev
        ? {
            ...prev,
            plans: [
              ...prev.plans,
              { count, amounts, tuitionFees, otherFees, dueDates },
            ].sort((a, b) => a.count - b.count),
          }
        : prev
    );
  };

  const updatePlanAmount = (count: number, index: number, value: number) => {
    setInstallmentPopup((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map((plan) => {
          if (plan.count !== count) return plan;
          const amounts = [...plan.amounts];
          amounts[index] = value;
          const tuitionFees = [...plan.tuitionFees];
          const otherFees = [...plan.otherFees];
          if (tuitionFees[index] + otherFees[index] > value) {
            otherFees[index] = value - tuitionFees[index];
          }
          return { ...plan, amounts, tuitionFees, otherFees };
        }),
      };
    });
  };

  const updatePlanTuition = (count: number, index: number, value: number) => {
    setInstallmentPopup((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map((plan) => {
          if (plan.count !== count) return plan;
          const tuitionFees = [...plan.tuitionFees];
          tuitionFees[index] = value;
          const otherFees = [...plan.otherFees];
          otherFees[index] = Math.max(0, plan.amounts[index] - value);
          return { ...plan, tuitionFees, otherFees };
        }),
      };
    });
  };

  const updatePlanOtherFee = (count: number, index: number, value: number) => {
    setInstallmentPopup((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map((plan) => {
          if (plan.count !== count) return plan;
          const otherFees = [...plan.otherFees];
          otherFees[index] = value;
          const tuitionFees = [...plan.tuitionFees];
          tuitionFees[index] = Math.max(0, plan.amounts[index] - value);
          return { ...plan, tuitionFees, otherFees };
        }),
      };
    });
  };

  const updatePlanDueDate = (count: number, index: number, value: string) => {
    setInstallmentPopup((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map((plan) => {
          if (plan.count !== count) return plan;
          const dueDates = [...plan.dueDates];
          dueDates[index] = value;
          return { ...plan, dueDates };
        }),
      };
    });
  };

  const updateFullPaymentDueDate = (value: string) => {
    setInstallmentPopup((prev) =>
      prev ? { ...prev, fullPaymentDueDate: value } : prev
    );
  };

  const updateOtherFeeDescription = (value: string) => {
    setInstallmentPopup((prev) =>
      prev ? { ...prev, otherFeeDescription: value } : prev
    );
  };

  const savePaymentOptions = () => {
    if (!installmentPopup) return;
    const {
      courseId,
      yearIndex,
      amount,
      tuitionFee,
      otherFee,
      otherFeeDescription,
      fullPaymentDueDate,
      plans,
    } = installmentPopup;
    const instituteId = feeStructure.instituteId;

    for (const plan of plans) {
      const total = plan.amounts.reduce((s, a) => s + a, 0);
      if (total !== amount) {
        toast.error(
          `${plan.count}-installment plan total (₹${total}) must equal ₹${amount}`
        );
        return;
      }
      for (let i = 0; i < plan.amounts.length; i++) {
        const sum = plan.tuitionFees[i] + plan.otherFees[i];
        if (sum !== plan.amounts[i]) {
          toast.error(
            `Installment ${i + 1}: tuition + other (₹${sum}) must equal ₹${
              plan.amounts[i]
            }`
          );
          return;
        }
        if (plan.tuitionFees[i] < 0 || plan.otherFees[i] < 0) {
          toast.error(`Fees cannot be negative for installment ${i + 1}`);
          return;
        }
      }
      if (plan.dueDates.some((d) => !d)) {
        toast.error(
          `Please set every due date for ${plan.count}-installment plan`
        );
        return;
      }
    }

    const fullOption = buildFullPaymentOption(
      amount,
      tuitionFee,
      otherFee,
      fullPaymentDueDate,
      instituteId
    );

    const installmentOptionsBuilt = plans.map((plan) =>
      buildInstallmentOption(
        plan.count,
        amount,
        tuitionFee,
        otherFee,
        plan.amounts,
        plan.dueDates,
        instituteId,
        plan.tuitionFees,
        plan.otherFees
      )
    );

    setFeeStructure((prev) => ({
      ...prev,
      courses: prev.courses.map((course) =>
        course.courseId === courseId
          ? {
              ...course,
              years: course.years.map((year, idx) =>
                idx === yearIndex
                  ? {
                      ...year,
                      paymentOptions: [
                        fullOption,
                        ...installmentOptionsBuilt,
                      ],
                      otherFeeDescription:
                        otherFeeDescription || year.otherFeeDescription,
                    }
                  : year
              ),
            }
          : course
      ),
    }));

    toast.success("Payment options saved!");
    closeInstallmentPopup();
  };

  /* -------------------- Fee handlers -------------------- */

  const handleTuitionFeeChange = (
    courseId: string,
    yearIndex: number,
    tuitionFee: number
  ) => {
    const course = feeStructure.courses.find((c) => c.courseId === courseId);
    if (!course) return;
    const year = course.years[yearIndex];
    const totalAmount = tuitionFee + year.otherFee;

    setFeeStructure((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.courseId === courseId
          ? {
              ...c,
              years: c.years.map((y, idx) =>
                idx === yearIndex
                  ? {
                      ...y,
                      tuitionFee,
                      amount: totalAmount,
                      paymentOptions:
                        totalAmount > 0
                          ? [
                              buildFullPaymentOption(
                                totalAmount,
                                tuitionFee,
                                year.otherFee,
                                todayStr(),
                                prev.instituteId
                              ),
                            ]
                          : [],
                    }
                  : y
              ),
            }
          : c
      ),
    }));
  };

  const handleOtherFeeChange = (
    courseId: string,
    yearIndex: number,
    otherFee: number
  ) => {
    const course = feeStructure.courses.find((c) => c.courseId === courseId);
    if (!course) return;
    const year = course.years[yearIndex];
    const totalAmount = year.tuitionFee + otherFee;

    setFeeStructure((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.courseId === courseId
          ? {
              ...c,
              years: c.years.map((y, idx) =>
                idx === yearIndex
                  ? {
                      ...y,
                      otherFee,
                      amount: totalAmount,
                      paymentOptions:
                        totalAmount > 0
                          ? [
                              buildFullPaymentOption(
                                totalAmount,
                                year.tuitionFee,
                                otherFee,
                                todayStr(),
                                prev.instituteId
                              ),
                            ]
                          : [],
                    }
                  : y
              ),
            }
          : c
      ),
    }));
  };

  const handleOtherFeeDescriptionChange = (
    courseId: string,
    yearIndex: number,
    description: string
  ) => {
    setFeeStructure((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.courseId === courseId
          ? {
              ...c,
              years: c.years.map((y, idx) =>
                idx === yearIndex
                  ? { ...y, otherFeeDescription: description }
                  : y
              ),
            }
          : c
      ),
    }));
  };

  const handleAddYear = (courseId: string) => {
    setFeeStructure((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.courseId === courseId
          ? {
              ...c,
              years: [
                ...c.years,
                {
                  year: String(c.years.length + 1),
                  amount: 0,
                  tuitionFee: 0,
                  otherFee: 0,
                  otherFeeDescription: "",
                  paymentOptions: [],
                },
              ],
            }
          : c
      ),
    }));
  };

  const handleRemoveYear = (courseId: string) => {
    setFeeStructure((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c.courseId === courseId && c.years.length > 1
          ? { ...c, years: c.years.slice(0, -1) }
          : c
      ),
    }));
  };

  const handleCommonAmountChange = (amount: number) => {
    setCommonAmount(amount);

    if (amount > 0) {
      const { tuitionFee, otherFee } = calculateFeeComponents(amount);
      setFeeStructure((prev) => ({
        ...prev,
        courses: prev.courses.map((course) => ({
          ...course,
          years: course.years.map((year) => ({
            ...year,
            amount,
            tuitionFee,
            otherFee,
            paymentOptions: [
              buildFullPaymentOption(
                amount,
                tuitionFee,
                otherFee,
                todayStr(),
                prev.instituteId
              ),
            ],
          })),
        })),
      }));
    } else {
      setFeeStructure((prev) => ({
        ...prev,
        courses: prev.courses.map((course) => ({
          ...course,
          years: course.years.map((year) => ({
            ...year,
            amount: 0,
            tuitionFee: 0,
            otherFee: 0,
            paymentOptions: [],
          })),
        })),
      }));
    }
  };

  /* -------------------- Referrals -------------------- */

  const handleAddReferral = () => {
    const name = referralName.trim();
    const percentage = referralPercentage;

    if (!name) return toast.error("Please enter concession name");
    if (percentage === "" || percentage < 0 || percentage > 100)
      return toast.error("Please enter a valid percentage (0-100)");
    if (
      feeStructure.referrals.some(
        (ref) => ref.name.toLowerCase() === name.toLowerCase()
      )
    )
      return toast.error("Concession name already exists");

    const newReferral: ReferralType = {
      referralId: generateReferralId(),
      name,
      percentage,
    };
    setFeeStructure((prev) => ({
      ...prev,
      referrals: [...prev.referrals, newReferral],
    }));
    setReferralName("");
    setReferralPercentage("");
    toast.success("Concession added: " + newReferral.referralId);
  };

  const handleUpdateReferral = () => {
    if (editingReferralIndex === null) return;
    const name = referralName.trim();
    const percentage = referralPercentage;

    if (!name) return toast.error("Please enter concession name");
    if (percentage === "" || percentage < 0 || percentage > 100)
      return toast.error("Please enter a valid percentage (0-100)");
    if (
      feeStructure.referrals.some(
        (ref, idx) =>
          ref.name.toLowerCase() === name.toLowerCase() &&
          idx !== editingReferralIndex
      )
    )
      return toast.error("Concession name already exists");

    setFeeStructure((prev) => ({
      ...prev,
      referrals: prev.referrals.map((ref, idx) =>
        idx === editingReferralIndex ? { ...ref, name, percentage } : ref
      ),
    }));
    setReferralName("");
    setReferralPercentage("");
    setEditingReferralIndex(null);
    toast.success("Concession updated");
  };

  const handleEditReferral = (index: number) => {
    const r = feeStructure.referrals[index];
    setReferralName(r.name);
    setReferralPercentage(r.percentage);
    setEditingReferralIndex(index);
  };

  const handleRemoveReferral = (index: number) => {
    setFeeStructure((prev) => ({
      ...prev,
      referrals: prev.referrals.filter((_, i) => i !== index),
    }));
    if (editingReferralIndex === index) {
      setReferralName("");
      setReferralPercentage("");
      setEditingReferralIndex(null);
    }
    toast.success("Concession removed");
  };

  const handleCancelReferralEdit = () => {
    setReferralName("");
    setReferralPercentage("");
    setEditingReferralIndex(null);
  };

  /* -------------------- Save -------------------- */

  const handleSaveAll = async () => {
    if (!selectedInstitute) return toast.error("Please select an institute");
    if (!academicYear) return toast.error("Please select an academic year");
    if (feeStructure.courses.length === 0)
      return toast.error("No courses available to save");

    let hasError = false;
    for (const course of feeStructure.courses) {
      for (const year of course.years) {
        if (year.amount <= 0) {
          toast.error(
            `Please set fee for ${course.courseName} - ${getYearDisplay(
              year.year
            )}`
          );
          hasError = true;
          break;
        }
        if (year.tuitionFee + year.otherFee !== year.amount) {
          toast.error(
            `Tuition + Other must equal total for ${
              course.courseName
            } - ${getYearDisplay(year.year)}`
          );
          hasError = true;
          break;
        }
        const hasFull = year.paymentOptions?.some(
          (opt) => opt.type === "full_payment"
        );
        if (!hasFull) {
          toast.error(
            `Full payment option missing for ${
              course.courseName
            } - ${getYearDisplay(year.year)}`
          );
          hasError = true;
          break;
        }
      }
      if (hasError) break;
    }
    if (hasError) return;

    const feeConfigPayload: FeeConfiguration = {
      instituteId: selectedInstitute.value,
      academicYear,
      courseFeeStructure: feeStructure.courses.map((c) => ({
        courseId: c.courseId,
        name: c.courseName,
        years: c.years.map((year) => ({
          year: year.year,
          amount: year.amount,
          tuitionFee: year.tuitionFee,
          otherFee: year.otherFee,
          otherFeeDescription: year.otherFeeDescription || "",
          paymentOptions: year.paymentOptions || [],
        })),
      })),
      referrals: feeStructure.referrals,
    };

    try {
      setIsLoading(true);
      const result = await saveFeeConfiguration(feeConfigPayload);
      toast.success(
        result.message || `Fee structure for ${academicYear} saved!`
      );
      setCommonAmount("");
      // Mark that config now exists for this year
      setConfigExistsForYear(true);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save fee structure");
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------- Popup UI -------------------- */

  const InstallmentPopup = () => {
    if (!installmentPopup) return null;
    const totalAmount = installmentPopup.amount;
    const { tuitionFee, otherFee, plans } = installmentPopup;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Payment Options Setup</h2>
              <p className="text-sm opacity-90">Total Amount: ₹{totalAmount}</p>
              <p className="text-xs opacity-75">
                Tuition: ₹{tuitionFee} | Other: ₹{otherFee}
              </p>
            </div>
            <button
              onClick={closeInstallmentPopup}
              className="text-white hover:text-gray-200"
            >
              <FaTimes size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Full Payment */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                    Full Payment (Default)
                  </h4>
                  <p className="text-sm text-gray-600">
                    Amount: ₹{totalAmount}
                  </p>
                  <p className="text-xs text-gray-500">
                    Tuition: ₹{tuitionFee} | Other: ₹{otherFee}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ✓ Always available, on its own object
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="border rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={installmentPopup.fullPaymentDueDate}
                    onChange={(e) => updateFullPaymentDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Other Fee Description */}
            <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-purple-500"></span>
                Other Fees Description
              </h4>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-y min-h-[80px]"
                placeholder="e.g., Lab fees, library fees, examination fees..."
                value={installmentPopup.otherFeeDescription || ""}
                onChange={(e) => updateOtherFeeDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Installment Plans */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                  Installment Plans
                </h3>
                <span className="text-xs text-gray-500">
                  Optional - turn on as many as you need
                </span>
              </div>

              <div className="mb-4">
                <div className="flex gap-2 flex-wrap">
                  {INSTALLMENT_COUNT_OPTIONS.map((count) => {
                    const active = plans.some((p) => p.count === count);
                    return (
                      <button
                        key={count}
                        onClick={() => togglePlan(count)}
                        className={`px-4 py-2 rounded-lg transition ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {count} Installments
                      </button>
                    );
                  })}
                </div>
                {plans.length === 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    ✓ No installment plans selected. Only Full Payment will be
                    available.
                  </p>
                )}
              </div>

              {plans.length > 0 && (
                <div className="space-y-5">
                  {plans.map((plan) => {
                    const planTotal = plan.amounts.reduce((s, a) => s + a, 0);
                    const matches = planTotal === totalAmount;
                    return (
                      <div
                        key={plan.count}
                        className="border-2 border-blue-100 rounded-lg p-4 bg-blue-50/30"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-700">
                            {plan.count} Installments
                          </h4>
                          <button
                            onClick={() => togglePlan(plan.count)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove plan
                          </button>
                        </div>

                        <div className="space-y-3">
                          {plan.amounts.map((amt, index) => (
                            <div
                              key={index}
                              className="border rounded-lg p-4 bg-white"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">
                                    Installment {index + 1} Amount (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={amt}
                                    onChange={(e) =>
                                      updatePlanAmount(
                                        plan.count,
                                        index,
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">
                                    Tuition Fee (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                    value={plan.tuitionFees[index] || 0}
                                    onChange={(e) =>
                                      updatePlanTuition(
                                        plan.count,
                                        index,
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">
                                    Other Fee (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={plan.otherFees[index] || 0}
                                    onChange={(e) =>
                                      updatePlanOtherFee(
                                        plan.count,
                                        index,
                                        Number(e.target.value)
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">
                                  Due Date
                                </label>
                                <input
                                  type="date"
                                  className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={plan.dueDates[index] || todayStr()}
                                  onChange={(e) =>
                                    updatePlanDueDate(
                                      plan.count,
                                      index,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div className="mt-2 text-xs">
                                {plan.tuitionFees[index] +
                                  plan.otherFees[index] !==
                                  plan.amounts[index] && (
                                  <span className="text-red-500">
                                    ⚠️ Tuition + Other must equal installment
                                    amount
                                  </span>
                                )}
                                {plan.tuitionFees[index] +
                                  plan.otherFees[index] ===
                                  plan.amounts[index] &&
                                  plan.amounts[index] > 0 && (
                                    <span className="text-green-500">
                                      ✓ Total matches: ₹{plan.amounts[index]}
                                    </span>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-white rounded-lg p-3 flex justify-between items-center mt-3">
                          <span className="font-semibold text-gray-700 text-sm">
                            Plan Total:
                          </span>
                          <span
                            className={`font-bold ${
                              matches ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            ₹{planTotal}
                            {!matches && (
                              <span className="text-xs ml-2 font-normal text-red-500">
                                (Must equal ₹{totalAmount})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={closeInstallmentPopup}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={savePaymentOptions}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                disabled={
                  plans.some(
                    (p) =>
                      p.amounts.reduce((s, a) => s + a, 0) !== totalAmount
                  ) ||
                  plans.some((p) =>
                    p.amounts.some(
                      (amt, idx) =>
                        p.tuitionFees[idx] + p.otherFees[idx] !== amt
                    )
                  )
                }
              >
                Save Payment Options
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* -------------------- Render -------------------- */

  const isSuperAdmin = role === "superadmin";
  const academicYearSelectValue = useMemo(
    () => academicYearOptions.find((o) => o.value === academicYear) || null,
    [academicYear, academicYearOptions]
  );

  return (
    <div className="p-6 space-y-8 mx-auto">
      <InstallmentPopup />

      {/* Institute Selection (superadmin only) */}
      {isSuperAdmin && (
        <div className="border rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
            Institute Selection
          </div>
          <div className="p-6 bg-white">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Select Institute <span className="text-red-500">*</span>
            </label>
            {isMounted ? (
              <Select
                options={institutions}
                value={selectedInstitute}
                onChange={(sel) => setSelectedInstitute(sel)}
                placeholder={
                  isLoading ? "Loading institutes..." : "Choose an institute..."
                }
                isClearable
                isDisabled={isLoading}
                className="text-sm"
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                }}
                noOptionsMessage={() =>
                  isLoading ? "Loading..." : "No institutes found"
                }
              />
            ) : (
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
            )}
            {institutions.length === 0 && !isLoading && (
              <p className="text-sm text-amber-600 mt-2">
                No institutes available. Please add institutes first.
              </p>
            )}
          </div>
        </div>
      )}

      {selectedInstitute && academicYear && (
        <>
          {/* Institute Header */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
              Institute Details
            </div>
            <div className="p-6 bg-white">
              <div className="flex items-center space-x-6">
                {feeStructure.logo && (
                  <img
                    src={feeStructure.logo}
                    alt={feeStructure.instituteName}
                    className="w-24 h-24 rounded-lg border object-cover"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {feeStructure.instituteName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Academic Year:{" "}
                    <span className="font-semibold text-gray-700">
                      {academicYear}
                    </span>{" "}
                    | Total Courses: {feeStructure.courses.length} | Total
                    Concessions: {feeStructure.referrals.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Year Selector */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
              Academic Year
            </div>

            <div className="p-6 bg-white">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Select Academic Year <span className="text-red-500">*</span>
              </label>

              {isMounted ? (
                <Select
                  options={academicYearOptions}
                  value={academicYearSelectValue}
                  onChange={(sel) => setAcademicYear(sel?.value || "")}
                  placeholder="Select academic year"
                  isClearable={false}
                  className="text-sm w-full"
                  classNamePrefix="academic-year"
                  menuPortalTarget={document.body}
                  styles={{
                    container: (base) => ({ ...base, width: "100%" }),
                    control: (base) => ({
                      ...base,
                      width: "100%",
                      minHeight: "42px",
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              ) : (
                <div className="h-10 bg-gray-100 rounded animate-pulse w-full" />
              )}

              {/* Status pill */}
              {isDataLoaded && !isLoading && (
                <div className="mt-3">
                  {configExistsForYear ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      ● Config exists for {academicYear}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ● No config for {academicYear} — fill and save to create
                    </span>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Fee structure is saved per academic year. Changing this will
                load/create that year&apos;s config.
              </p>
            </div>
          </div>

          {/* Course Fee Structure */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
              Course Fee Structure
            </div>

            <div className="p-6 bg-white overflow-x-auto">
              {feeStructure.courses.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Common Amount for All Years:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="w-48 border rounded px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter total amount"
                    value={commonAmount}
                    onChange={(e) =>
                      handleCommonAmountChange(Number(e.target.value))
                    }
                  />
                  <span className="text-xs text-gray-500">
                    Auto-calculates tuition (70%) & other (30%)
                  </span>
                  {commonAmount !== "" && commonAmount > 0 && (
                    <button
                      onClick={() => {
                        setCommonAmount("");
                        handleCommonAmountChange(0);
                      }}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}

              {feeStructure.courses.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                            Course Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-[150px] bg-gray-50 z-10 min-w-[120px]">
                            Course ID
                          </th>
                          {feeStructure.courses[0]?.years.map(
                            (year, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[450px]"
                              >
                                {getYearDisplay(year.year)} Fee
                              </th>
                            )
                          )}
                          {isSuperAdmin && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 min-w-[140px]">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {feeStructure.courses.map((course) => (
                          <tr
                            key={course.courseId}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap">
                              {course.courseName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 font-mono sticky left-[150px] bg-white z-10 whitespace-nowrap">
                              {course.courseId}
                            </td>
                            {course.years.map((year, yearIdx) => (
                              <td key={yearIdx} className="px-4 py-3">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex-1 min-w-[120px]">
                                      <label className="text-xs text-gray-500 block">
                                        Tuition Fee
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Tuition"
                                        value={year.tuitionFee || ""}
                                        onChange={(e) => {
                                          handleTuitionFeeChange(
                                            course.courseId,
                                            yearIdx,
                                            Number(e.target.value)
                                          );
                                          if (commonAmount !== "")
                                            setCommonAmount("");
                                        }}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                      <label className="text-xs text-gray-500 block">
                                        Other Fee
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Other"
                                        value={year.otherFee || ""}
                                        onChange={(e) => {
                                          handleOtherFeeChange(
                                            course.courseId,
                                            yearIdx,
                                            Number(e.target.value)
                                          );
                                          if (commonAmount !== "")
                                            setCommonAmount("");
                                        }}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                      <label className="text-xs text-gray-500 block">
                                        Total Amount
                                      </label>
                                      <div className="font-semibold text-gray-900 px-2 py-1 bg-gray-50 rounded border">
                                        {formatCurrency(year.amount)}
                                      </div>
                                      {year.tuitionFee + year.otherFee !==
                                        year.amount &&
                                        year.amount > 0 && (
                                          <p className="text-xs text-red-500 mt-1">
                                            ⚠️ Sum must equal total
                                          </p>
                                        )}
                                    </div>
                                    {year.amount > 0 && (
                                      <button
                                        onClick={() =>
                                          openInstallmentPopup(
                                            course.courseId,
                                            yearIdx
                                          )
                                        }
                                        className="text-blue-600 hover:text-blue-800 transition p-1"
                                        title="Manage Payment Options"
                                      >
                                        <FaCreditCard size={18} />
                                        {year.paymentOptions &&
                                          year.paymentOptions.length > 1 && (
                                            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                              {year.paymentOptions.length - 1}
                                            </span>
                                          )}
                                      </button>
                                    )}
                                  </div>

                                  <div className="mt-1">
                                    <label className="text-xs text-gray-500 block">
                                      Other Fees Description
                                    </label>
                                    <textarea
                                      className="w-full border rounded px-2 py-1 text-xs focus:ring-2 focus:ring-purple-500 outline-none resize-y min-h-[60px]"
                                      placeholder="Describe what the other fees include..."
                                      value={year.otherFeeDescription || ""}
                                      onChange={(e) =>
                                        handleOtherFeeDescriptionChange(
                                          course.courseId,
                                          yearIdx,
                                          e.target.value
                                        )
                                      }
                                      rows={2}
                                    />
                                  </div>

                                  {year.paymentOptions &&
                                    year.paymentOptions.length > 0 && (
                                      <div className="text-xs text-gray-500 space-y-1">
                                        {year.paymentOptions.map((option) => (
                                          <div
                                            key={option.paymentOptionId}
                                            className="border-t pt-1 mt-1 first:border-t-0 first:pt-0 first:mt-0"
                                          >
                                            <div className="flex items-center gap-1 flex-wrap">
                                              <span
                                                className={`inline-block w-2 h-2 rounded-full ${
                                                  option.type ===
                                                  "full_payment"
                                                    ? "bg-green-500"
                                                    : "bg-blue-500"
                                                }`}
                                              ></span>
                                              <span className="font-medium">
                                                {option.name}
                                              </span>
                                            </div>
                                            {option.installments.map(
                                              (inst) => (
                                                <div
                                                  key={inst.number}
                                                  className="pl-3 text-gray-400"
                                                >
                                                  #{inst.number}: ₹
                                                  {inst.amount} (T:₹
                                                  {inst.tuitionFee} O:₹
                                                  {inst.otherFee})
                                                  {inst.dueDate && (
                                                    <span className="ml-1">
                                                      {formatDateForInput(
                                                        inst.dueDate
                                                      )}
                                                    </span>
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  {(!year.paymentOptions ||
                                    year.paymentOptions.length === 0) &&
                                    year.amount > 0 && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        <span className="text-green-600">
                                          ✓
                                        </span>{" "}
                                        Full payment available
                                      </div>
                                    )}
                                </div>
                              </td>
                            ))}
                            {isSuperAdmin && (
                              <td className="px-4 py-3 sticky right-0 bg-white z-10">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() =>
                                      handleAddYear(course.courseId)
                                    }
                                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 whitespace-nowrap"
                                  >
                                    + Year
                                  </button>
                                  {course.years.length > 1 && (
                                    <button
                                      onClick={() =>
                                        handleRemoveYear(course.courseId)
                                      }
                                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 whitespace-nowrap"
                                    >
                                      - Year
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-gray-400 p-2 text-center border-t">
                    <span>
                      ↔ Scroll horizontally | T=Tuition Fee, O=Other Fee | Click
                      credit card icon to manage payment options
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No courses available. Please add courses in the settings
                  first.
                </div>
              )}
            </div>
          </div>

          {/* Concession Management */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
              Concession Management
            </div>

            <div className="p-6 bg-white">
              <div className="flex flex-wrap items-end gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Concession Name
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Enter Concession name"
                    value={referralName}
                    onChange={(e) => setReferralName(e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={inputClass}
                    placeholder="0-100"
                    value={referralPercentage}
                    onChange={(e) =>
                      setReferralPercentage(Number(e.target.value))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  {editingReferralIndex !== null ? (
                    <>
                      <button
                        onClick={handleUpdateReferral}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      >
                        Update
                      </button>
                      <button
                        onClick={handleCancelReferralEdit}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAddReferral}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      + Add Concession
                    </button>
                  )}
                </div>
              </div>

              {feeStructure.referrals.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Concession ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Concession Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commission (%)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {feeStructure.referrals.map((referral, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-500">
                            {referral.referralId}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {referral.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {referral.percentage}%
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditReferral(index)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No Concession added yet.
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveAll}
              disabled={isLoading}
              className={`px-6 py-3 bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white text-sm rounded-lg hover:opacity-90 transition shadow-md font-semibold ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading
                ? "Saving..."
                : `Save Fee Structure (${academicYear})`}
            </button>
          </div>
        </>
      )}

      {!selectedInstitute && institutions.length > 0 && isSuperAdmin && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">
            Please select an institute to manage its fee structure
          </p>
          <p className="text-gray-400 text-sm mt-2">
            You can set year-wise fees and concession commissions
          </p>
        </div>
      )}

      {!selectedInstitute && institutions.length > 0 && !isSuperAdmin && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">
            Loading your institute details...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Please wait while we fetch your institute information
          </p>
        </div>
      )}

      {!selectedInstitute && institutions.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No institutes available</p>
          <p className="text-gray-400 text-sm mt-2">
            Please add institutes first before setting up fee structure
          </p>
        </div>
      )}
    </div>
  );
}