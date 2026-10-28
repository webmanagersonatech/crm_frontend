"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Info,
  Wallet,
  User,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  getPaidFeesRequest,
  upsertStudentFeeStructureRequest,
  type PaidFeeRecord,
  type UpsertStudentFeeStructurePayload,
  type YearOption,
  type YearFeePayload,
} from "@/app/lib/request/studentRequest";

interface GivenAmountDialogProps {
  open: boolean;
  studentId: string | null;
  programId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Entry {
  date: string;
  amount: string;
  description: string;
}

/* ───────── Helpers ───────── */

const MAX_INSTALLMENTS = 5;

/** Only this institute gets the Vijayadashami preset option. */
const VIJAY_DASHAMI_INSTITUTE_ID = "INS-3-ZXYXKM";

/**
 * Academic-year-wise Vijayadashami fee structure.
 * Add / adjust entries per academic year as needed.
 */
const VIJAY_DASHAMI_PRESETS: Record<
  string,
  { label: string; tuitionFee: number; otherFee: number }
> = {
  "2023-2024": {
    label: "Vijayadashami 2023-24",
    tuitionFee: 50000,
    otherFee: 8000,
  },
  "2024-2025": {
    label: "Vijayadashami 2024-25",
    tuitionFee: 35000,
    otherFee: 5000,
  },
  "2025-2026": {
    label: "Vijayadashami 2025-26",
    tuitionFee: 60000,
    otherFee: 12000,
  },
  "2027-2028": {
    label: "Vijayadashami 2027-28",
    tuitionFee: 60000,
    otherFee: 12000,
  },
};

interface AppliedPreset {
  academicYear: string;
  label: string;
  tuitionFee: number;
  otherFee: number;
}

function toInputDate(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value as string | number | Date);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

const formatDate = (v: unknown) => {
  const s = toInputDate(v);
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Split `total` into `n` parts, rounded to 2dp, remainder on the last. */
const splitEvenly = (total: number, n: number): number[] => {
  if (n <= 0) return [];
  const safeTotal = round2(Math.max(total, 0));
  const per = Math.floor((safeTotal / n) * 100) / 100;
  const parts = Array.from({ length: n }, () => per);
  const remainder = round2(safeTotal - per * n);
  if (remainder > 0.001) parts[n - 1] = round2(parts[n - 1] + remainder);
  return parts;
};

interface InstallmentView {
  paymentOptionId: string;
  optionName: string;
  optionType: "full_payment" | "installment";
  number: number;
  amount: number; // ORIGINAL payable (before any given amount)
  tuitionFee: number;
  otherFee: number;
  tuitionConcession: number;
  otherFeeConcession: number;
  dueDate: string;
  status?: string;
  paidAmount?: number;
  existingApplied: number; // appliedNow already persisted in the snapshot
  applied: number; // NEW allocation computed for this submission only
  totalApplied: number; // existingApplied + applied  (what gets saved)
  remaining: number; // original payable − paid − totalApplied
  isPaid: boolean;
  isFullyCovered: boolean;
}

interface NormalizedInstallment {
  number: number;
  amount: number;
  tuitionFee: number;
  otherFee: number;
  payableAmount?: number;
  dueDate: string;
  status?: string;
  paidAmount?: number;
  paidDate?: string | null;
  paymentId?: string | null;
  concessionPercentage?: number;
  tuitionConcession?: number;
  otherFeeConcession?: number;
  appliedNow?: number;
}

interface NormalizedOption {
  paymentOptionId: string;
  name: string;
  type: "full_payment" | "installment";
  installments: NormalizedInstallment[];
}

interface StudentInfo {
  _id?: string;
  firstname?: string;
  lastname?: string;
  studentId?: string;
  instituteId?: string;
  programId?: string;
  year?: string | number;
  academicYear?: string;
}

/**
 * Original payable of an installment BEFORE the given amount was applied.
 * A saved snapshot stores payableAmount already reduced by appliedNow, so
 * appliedNow is added back. For `paid` installments appliedNow is
 * intentionally NOT added back — the paid snapshot is already final.
 */
const getOriginalPayable = (inst: NormalizedInstallment): number => {
  const instTuition = Number(inst.tuitionFee || 0);
  const instOther = Number(inst.otherFee || 0);
  const instConcPct = Number(inst.concessionPercentage || 0);
  const instTuitionConc = Number(
    inst.tuitionConcession ?? (instTuition * instConcPct) / 100
  );

  const stored = Number(
    inst.payableAmount ?? instTuition - instTuitionConc + instOther
  );

  const appliedBefore =
    inst.status === "paid" ? 0 : Number(inst.appliedNow || 0);

  return round2(stored + appliedBefore);
};

/**
 * Rebuild an installment's derived fields after its tuitionFee / otherFee
 * change, keeping paid status, paidAmount, and appliedNow intact so the
 * given-amount allocation keeps working.
 */
const rebuildInstallment = (
  inst: NormalizedInstallment,
  tuitionFee: number,
  otherFee: number,
  concPct: number
): NormalizedInstallment => {
  const tuitionConcession = round2((tuitionFee * concPct) / 100);
  const originalPayable = round2(tuitionFee - tuitionConcession + otherFee);
  const appliedNow = Number(inst.appliedNow || 0);
  const isPaid = inst.status === "paid";

  return {
    ...inst,
    tuitionFee,
    otherFee,
    concessionPercentage: concPct,
    tuitionConcession,
    otherFeeConcession: 0,
    payableAmount: isPaid
      ? originalPayable
      : round2(Math.max(originalPayable - appliedNow, 0)),
  };
};

export default function GivenAmountDialog({
  open,
  studentId,
  programId,
  onClose,
  onSuccess,
}: GivenAmountDialogProps) {
  const [year, setYear] = useState("");
  const [entries, setEntries] = useState<Entry[]>([
    { date: "", amount: "", description: "" },
  ]);
  /** Opt-in: user must explicitly enable "Amount Details" to require entries. */
  const [entriesEnabled, setEntriesEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [existingFees, setExistingFees] = useState<PaidFeeRecord[]>([]);
  const [yearFeeData, setYearFeeData] = useState<YearFeePayload[]>([]);
  const [yearOptions, setYearOptions] = useState<YearOption[]>([]);
  const [academicYear, setAcademicYear] = useState<string | null>(null);

  const [student, setStudent] = useState<StudentInfo | null>(null);

  const [concessionMeta, setConcessionMeta] = useState<{
    paymentOptionId: string | null;
    paymentMode: "full_payment" | "installment" | null;
    allowedInstallmentCount: number;
  }>({
    paymentOptionId: null,
    paymentMode: null,
    allowedInstallmentCount: 2,
  });

  const [selectedOptionType, setSelectedOptionType] = useState<
    "full_payment" | "installment"
  >("installment");

  /** Editable working copy of the active option's installments. */
  const [workingInstallments, setWorkingInstallments] = useState<
    NormalizedInstallment[]
  >([]);

  /** Applied Vijayadashami preset for the current year (null = none). */
  const [appliedPreset, setAppliedPreset] = useState<AppliedPreset | null>(
    null
  );

  const existingForYear = existingFees.find(
    (f) => Number(f.year) === Number(year)
  );
  const isEditing = !!existingForYear;

  const selectedYearData = yearFeeData.find(
    (y) => Number(y.year) === Number(year)
  );
  const hasSnapshot = selectedYearData?.source === "studentFeeStructure";

  /* ── Reset + fetch when dialog opens ── */
  useEffect(() => {
    if (!open) return;

    setYear("");
    setEntries([{ date: "", amount: "", description: "" }]);
    setEntriesEnabled(false);
    setExistingFees([]);
    setYearFeeData([]);
    setYearOptions([]);
    setAcademicYear(null);
    setStudent(null);
    setWorkingInstallments([]);
    setAppliedPreset(null);
    setConcessionMeta({
      paymentOptionId: null,
      paymentMode: null,
      allowedInstallmentCount: 2,
    });
    setSelectedOptionType("installment");

    if (studentId) loadData(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

  const loadData = async (sid: string) => {
    try {
      setFetching(true);
      const res = await getPaidFeesRequest(sid);
      if (res.success) {
        setExistingFees(res.data.paidFees || []);
        setYearOptions(res.data.yearOptions || []);
        setYearFeeData(res.data.years || []);
        setAcademicYear(res.data.student?.academicYear ?? null);

        if (res.data.student) {
          setStudent({
            _id: res.data.student._id,
            firstname: res.data.student.firstname,
            lastname: res.data.student.lastname,
            studentId: res.data.student.studentId,
            instituteId: res.data.student.instituteId,
            programId: res.data.student.programId,
            year: res.data.student.year,
            academicYear: res.data.student.academicYear,
          });

          // ✅ Default-select the student's current year
          const defaultYear = res.data.student.year;
          if (defaultYear != null && String(defaultYear) !== "") {
            setYear(String(defaultYear));
          }
        }

        const fc = (res.data as any).feeConcession;
        if (fc) {
          const mode =
            (fc.paymentMode as "full_payment" | "installment" | null) ?? null;

          setConcessionMeta({
            paymentOptionId: fc.paymentOptionId ?? null,
            paymentMode: mode,
            allowedInstallmentCount:
              Number(fc.allowedInstallmentCount ?? 2) || 2,
          });

          if (mode) setSelectedOptionType(mode);
        }
      }
    } catch (err: any) {
      console.error("Failed to load existing fees:", err.message);
    } finally {
      setFetching(false);
    }
  };

  /* ── Prefill entries when editing ── */
  useEffect(() => {
    if (!year) return;

    const snapshotYear = yearFeeData.find(
      (y) =>
        Number(y.year) === Number(year) && y.source === "studentFeeStructure"
    );

    const snapshotGivenEntries = (snapshotYear as any)?.givenEntries;

    if (
      Array.isArray(snapshotGivenEntries) &&
      snapshotGivenEntries.length > 0
    ) {
      setEntries(
        snapshotGivenEntries.map((e: any) => ({
          date: toInputDate(e.date),
          amount: String(e.amount ?? ""),
          description: e.description ?? "",
        }))
      );
      setEntriesEnabled(true);
      return;
    }

    const match = existingFees.find((f) => Number(f.year) === Number(year));

    if (match && match.entries?.length) {
      setEntries(
        match.entries.map((e) => ({
          date: toInputDate(e.date),
          amount: String(e.amount ?? ""),
          description: e.description ?? "",
        }))
      );
      setEntriesEnabled(true);
    } else {
      setEntries([{ date: "", amount: "", description: "" }]);
    }
  }, [year, existingFees, yearFeeData]);

  /* ── Totals ── */

  const totalGivenAmount = useMemo(() => {
    if (!entriesEnabled) return 0;
    return entries.reduce((sum, e) => {
      const n = Number(e.amount);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }, [entries, entriesEnabled]);

  const tuitionFeeYear = selectedYearData
    ? Number(selectedYearData.tuitionFee || 0)
    : 0;
  const otherFeeYear = selectedYearData
    ? Number(selectedYearData.otherFee || 0)
    : 0;

  const concessionPercentage = selectedYearData
    ? Number(selectedYearData.concessionPercentage || 0)
    : 0;

  const tuitionConcessionYear = selectedYearData
    ? Number(selectedYearData.tuitionConcession || 0) ||
    round2((tuitionFeeYear * concessionPercentage) / 100)
    : 0;

  const discountedTuitionYear = round2(
    tuitionFeeYear - tuitionConcessionYear
  );

  /* ── Institute gate for the Vijayadashami preset ── */

  const isVijayInstitute =
    student?.instituteId === VIJAY_DASHAMI_INSTITUTE_ID;

  const effectiveAcademicYear = appliedPreset
    ? appliedPreset.academicYear
    : selectedYearData?.academicYear || academicYear || undefined;

  /** The preset definition for the active academic year (if any). */
  const activePresetDefinition = useMemo(() => {
    if (!effectiveAcademicYear) return null;
    return VIJAY_DASHAMI_PRESETS[effectiveAcademicYear] ?? null;
  }, [effectiveAcademicYear]);

  /* ── Effective year pools (respect the applied preset) ── */

  const effectiveTuitionFee = appliedPreset
    ? appliedPreset.tuitionFee
    : tuitionFeeYear;

  const effectiveOtherFee = appliedPreset
    ? appliedPreset.otherFee
    : otherFeeYear;

  const effectiveBaseTotal = round2(
    effectiveTuitionFee + effectiveOtherFee
  );

  const effectiveTuitionConcession = appliedPreset
    ? round2((appliedPreset.tuitionFee * concessionPercentage) / 100)
    : tuitionConcessionYear;

  const effectiveDiscountedTuition = round2(
    effectiveTuitionFee - effectiveTuitionConcession
  );

  const effectiveDiscountedTotal = round2(
    effectiveDiscountedTuition + effectiveOtherFee
  );

  /* ── Normalize available payment options ── */

  const availableOptions: NormalizedOption[] = (() => {
    if (!selectedYearData) return [];

    if (hasSnapshot && selectedYearData.paymentOption) {
      return [selectedYearData.paymentOption as NormalizedOption];
    }

    const opts = (selectedYearData.paymentOptions || []) as NormalizedOption[];
    return opts;
  })();

  const hasFullOption = availableOptions.some(
    (o) => o.type === "full_payment"
  );
  const hasInstallmentOption = availableOptions.some(
    (o) => o.type === "installment"
  );

  const baseOption: NormalizedOption | null =
    availableOptions.find((o) => o.type === selectedOptionType) ||
    availableOptions[0] ||
    null;

  /* ── Seed the editable working copy from the base option ── */
  const seedKey = useMemo(() => {
    if (!baseOption) return "";
    return [
      year,
      selectedOptionType,
      selectedYearData?.source ?? "",
      baseOption.paymentOptionId,
      baseOption.installments
        .map(
          (i) =>
            `${i.number}:${i.tuitionFee}:${i.otherFee}:${i.appliedNow ?? 0}:${i.status ?? ""
            }`
        )
        .join("|"),
    ].join("::");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selectedOptionType, selectedYearData, baseOption]);

  useEffect(() => {
    setAppliedPreset(null);

    if (!baseOption) {
      setWorkingInstallments([]);
      return;
    }
    setWorkingInstallments(baseOption.installments.map((i) => ({ ...i })));
    // reseed whenever the underlying option changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  /**
   * The active option is the base option with its installments replaced
   * by the editable working copy (once seeded).
   */
  const activeOption: NormalizedOption | null = useMemo(() => {
    if (!baseOption) return null;
    if (workingInstallments.length === 0) return baseOption;
    return { ...baseOption, installments: workingInstallments };
  }, [baseOption, workingInstallments]);

  /* ── Plan lock: any paid installment freezes add/remove ── */
  const planLocked = useMemo(
    () => workingInstallments.some((i) => i.status === "paid"),
    [workingInstallments]
  );

  /**
   * ✅ Fully paid = EVERY installment in the plan is `paid`.
   * When true, nothing can be saved / edited at all.
   */
  const allPaid = useMemo(
    () =>
      workingInstallments.length > 0 &&
      workingInstallments.every((i) => i.status === "paid"),
    [workingInstallments]
  );

  /**
   * ✅ Add/Remove only make sense for installment plans — a full-payment
   * option must always have exactly one row.
   */
  const canAddInstallment =
    !!activeOption &&
    activeOption.type === "installment" &&
    !planLocked &&
    workingInstallments.length > 0 &&
    workingInstallments.length < MAX_INSTALLMENTS;

  const canRemoveInstallment =
    !!activeOption &&
    activeOption.type === "installment" &&
    !planLocked &&
    workingInstallments.length > 1;

  /**
   * ✅ The Vijayadashami preset is gated on:
   *   - the correct institute (INS-3-ZXYXKM)
   *   - a preset defined for the active academic year
   *   - the plan not being locked / fully paid
   */
  const canApplyVijayPreset =
    !!activeOption &&
    isVijayInstitute &&
    !!activePresetDefinition &&
    !planLocked &&
    !allPaid &&
    workingInstallments.length > 0 &&
    !loading &&
    !fetching;

  /* ── Pool totals across the working copy (must equal year totals) ── */

  const workingTuitionPool = useMemo(
    () =>
      round2(
        workingInstallments.reduce(
          (s, i) => s + Number(i.tuitionFee || 0),
          0
        )
      ),
    [workingInstallments]
  );

  const workingOtherPool = useMemo(
    () =>
      round2(
        workingInstallments.reduce(
          (s, i) => s + Number(i.otherFee || 0),
          0
        )
      ),
    [workingInstallments]
  );

  /* ── yearTotalPayable (BEFORE the given amount) ── */

  const yearTotalPayable = useMemo(() => {
    if (activeOption && activeOption.installments.length > 0) {
      const sum = activeOption.installments.reduce(
        (s, inst) => s + getOriginalPayable(inst),
        0
      );
      if (sum > 0) return round2(sum);
    }
    return round2(Math.max(effectiveDiscountedTotal, 0));
  }, [activeOption, effectiveDiscountedTotal]);

  /* ── Build installment views ── */

  const installmentViews: InstallmentView[] = useMemo(() => {
    if (!activeOption) return [];

    // how much of the cumulative given amount is already baked into the
    // snapshot as `appliedNow` across all installments.
    const alreadyAllocated = activeOption.installments.reduce(
      (s, inst) => s + Number(inst.appliedNow || 0),
      0
    );

    // only the *delta* (unallocated remainder) may be freshly distributed.
    const unallocatedGiven = round2(
      Math.max(totalGivenAmount - alreadyAllocated, 0)
    );

    const base = activeOption.installments.map((inst) => {
      const instTuition = Number(inst.tuitionFee || 0);
      const instOther = Number(inst.otherFee || 0);
      const instConcPct = Number(
        inst.concessionPercentage ?? concessionPercentage
      );

      const instTuitionConc = round2(
        Number(inst.tuitionConcession ?? (instTuition * instConcPct) / 100)
      );
      const instOtherConc = 0;

      // Original payable BEFORE any given amount (appliedNow added back)
      const payable = getOriginalPayable({
        ...inst,
        concessionPercentage: instConcPct,
      });

      const alreadyPaid = Number(inst.paidAmount || 0);
      const isPaid = inst.status === "paid";
      const existingApplied = Number(inst.appliedNow || 0);

      // subtract the *existing* appliedNow when computing what's owed
      const owed = isPaid
        ? 0
        : Math.max(payable - alreadyPaid - existingApplied, 0);

      return {
        inst,
        payable,
        instTuition,
        instOther,
        instTuitionConc,
        instOtherConc,
        alreadyPaid,
        isPaid,
        existingApplied,
        owed,
      };
    });

    const unpaid = base.filter((b) => !b.isPaid && b.owed > 0);

    const applyMap = new Map<number, number>();
    if (unpaid.length > 0 && unallocatedGiven > 0) {
      const per = unallocatedGiven / unpaid.length;
      const perRounded = Math.floor(per * 100) / 100;
      let leftover = round2(unallocatedGiven - perRounded * unpaid.length);

      unpaid.forEach((u) => {
        let applied = perRounded;
        if (leftover > 0.001) {
          applied = round2(applied + 0.01);
          leftover = round2(leftover - 0.01);
        }
        applied = Math.min(applied, u.owed);
        applyMap.set(u.inst.number, round2(applied));
      });
    }

    return base.map((b) => {
      const applied = applyMap.get(b.inst.number) ?? 0;
      const totalApplied = round2(b.existingApplied + applied);
      const remaining = b.isPaid ? 0 : Math.max(b.owed - applied, 0);

      return {
        paymentOptionId: activeOption.paymentOptionId,
        optionName: activeOption.name,
        optionType: activeOption.type,
        number: b.inst.number,
        amount: b.payable, // original, before any given amount
        tuitionFee: b.instTuition,
        otherFee: b.instOther,
        tuitionConcession: b.instTuitionConc,
        otherFeeConcession: b.instOtherConc,
        dueDate: b.inst.dueDate,
        status: b.inst.status,
        paidAmount: b.alreadyPaid,
        existingApplied: b.existingApplied,
        applied,
        totalApplied,
        remaining,
        isPaid: b.isPaid,
        isFullyCovered: !b.isPaid && remaining === 0 && b.owed > 0,
      };
    });
  }, [activeOption, totalGivenAmount, concessionPercentage]);

  const coveredCount = installmentViews.filter(
    (i) => i.isFullyCovered || i.isPaid
  ).length;
  const totalInstallments = installmentViews.length;

  /* ── Installment add / remove ── */

  const addInstallment = () => {
    if (!activeOption || workingInstallments.length === 0) return;

    if (workingInstallments.length >= MAX_INSTALLMENTS) {
      toast.error(`Maximum ${MAX_INSTALLMENTS} installments allowed`);
      return;
    }

    if (planLocked) {
      toast.error("Cannot add installments after a payment is made");
      return;
    }

    const current = workingInstallments;
    const totalTuition = current.reduce(
      (s, i) => s + Number(i.tuitionFee || 0),
      0
    );
    const totalOther = current.reduce(
      (s, i) => s + Number(i.otherFee || 0),
      0
    );
    const concPct = Number(
      current[0]?.concessionPercentage ?? concessionPercentage
    );

    const nextCount = current.length + 1;
    const tuitionParts = splitEvenly(totalTuition, nextCount);
    const otherParts = splitEvenly(totalOther, nextCount);

    const rebuilt = current.map((inst, idx) =>
      rebuildInstallment(inst, tuitionParts[idx], otherParts[idx], concPct)
    );

    const nextNumber = Math.max(0, ...current.map((i) => i.number)) + 1;
    const newTuition = tuitionParts[nextCount - 1];
    const newOther = otherParts[nextCount - 1];
    const newConcession = round2((newTuition * concPct) / 100);
    const newOriginalPayable = round2(
      newTuition - newConcession + newOther
    );

    const newInst: NormalizedInstallment = {
      number: nextNumber,
      amount: 0,
      tuitionFee: newTuition,
      otherFee: newOther,
      concessionPercentage: concPct,
      tuitionConcession: newConcession,
      otherFeeConcession: 0,
      payableAmount: newOriginalPayable,
      appliedNow: 0,
      dueDate: new Date().toISOString(),
      status: "pending",
      paidAmount: 0,
    };

    setWorkingInstallments([...rebuilt, newInst]);
  };

  const removeInstallment = (number: number) => {
    if (workingInstallments.length <= 1) return;

    if (planLocked) {
      toast.error("Cannot remove installments after a payment is made");
      return;
    }

    const target = workingInstallments.find((i) => i.number === number);
    if (!target) return;

    const remaining = workingInstallments.filter(
      (i) => i.number !== number
    );

    // Re-merge the removed row's fees and re-split across the rest.
    const totalTuition = workingInstallments.reduce(
      (s, i) => s + Number(i.tuitionFee || 0),
      0
    );
    const totalOther = workingInstallments.reduce(
      (s, i) => s + Number(i.otherFee || 0),
      0
    );
    const concPct = Number(
      remaining[0]?.concessionPercentage ?? concessionPercentage
    );

    const tuitionParts = splitEvenly(totalTuition, remaining.length);
    const otherParts = splitEvenly(totalOther, remaining.length);

    const rebuilt = remaining.map((inst, idx) =>
      rebuildInstallment(inst, tuitionParts[idx], otherParts[idx], concPct)
    );

    setWorkingInstallments(rebuilt);
  };

  /* ── Update an installment's due date ── */
  const updateInstallmentDueDate = (number: number, dueDate: string) => {
    setWorkingInstallments((prev) =>
      prev.map((i) => (i.number === number ? { ...i, dueDate } : i))
    );
  };

  /* ── Apply Vijayadashami preset (academic-year aware) ── */

  const applyVijayDashami = () => {
    if (!isVijayInstitute) {
      toast.error("Vijayadashami preset is not available for this institute");
      return;
    }

    if (!activePresetDefinition || !effectiveAcademicYear) {
      toast.error(
        `No Vijayadashami preset configured for academic year ${effectiveAcademicYear || "—"
        }`
      );
      return;
    }

    if (!activeOption || workingInstallments.length === 0) {
      toast.error("No installments to apply the preset to");
      return;
    }

    if (planLocked) {
      toast.error("Cannot change fees after a payment is made");
      return;
    }

    if (allPaid) {
      toast.error("All installments are already paid — nothing to change");
      return;
    }

    const concPct = Number(
      workingInstallments[0]?.concessionPercentage ?? concessionPercentage
    );

    const count = workingInstallments.length;
    const tuitionParts = splitEvenly(
      activePresetDefinition.tuitionFee,
      count
    );
    const otherParts = splitEvenly(
      activePresetDefinition.otherFee,
      count
    );

    const rebuilt = workingInstallments.map((inst, idx) =>
      rebuildInstallment(inst, tuitionParts[idx], otherParts[idx], concPct)
    );

    setWorkingInstallments(rebuilt);
    setAppliedPreset({
      academicYear: effectiveAcademicYear,
      label: activePresetDefinition.label,
      tuitionFee: activePresetDefinition.tuitionFee,
      otherFee: activePresetDefinition.otherFee,
    });

    toast.success(
      `${activePresetDefinition.label} fee structure applied (${effectiveAcademicYear})`
    );
  };

  /* ── Entry handlers ── */

  const addEntry = () =>
    setEntries((prev) => [...prev, { date: "", amount: "", description: "" }]);

  const removeEntry = (i: number) =>
    setEntries((prev) => prev.filter((_, idx) => idx !== i));

  const updateEntry = (i: number, field: keyof Entry, value: string) =>
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e))
    );

  /* ── Submit ── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Hard guard: nothing can be saved when the plan is fully paid.
    if (allPaid) {
      toast.error("All installments are paid — fee structure is locked");
      return;
    }

    if (!studentId) return toast.error("Student not selected");
    if (!year) return toast.error("Please select year");

    if (!activeOption) {
      return toast.error("Payment option not available");
    }

    // Amount entries are optional — only validate when the user turned them on.
    let givenEntriesPayload: {
      date: string;
      amount: number;
      description: string;
    }[] = [];

    if (entriesEnabled) {
      if (entries.length === 0) {
        return toast.error("Please add at least one entry");
      }

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.date) {
          return toast.error(`Entry ${i + 1}: Date is required`);
        }
        const amt = Number(entry.amount);
        if (!entry.amount || isNaN(amt) || amt <= 0) {
          return toast.error(`Entry ${i + 1}: Amount is required`);
        }
      }

      givenEntriesPayload = entries
        .filter((e) => Number(e.amount) > 0)
        .map((e) => ({
          date: e.date,
          amount: Number(e.amount),
          description: e.description.trim(),
        }));
    }

    // guard: split must equal year total (which may be the preset)
    const yearPool = round2(effectiveTuitionFee + effectiveOtherFee);
    const splitTotal = round2(workingTuitionPool + workingOtherPool);
    if (Math.abs(splitTotal - yearPool) > 0.01) {
      return toast.error(
        `Installment split (${formatCurrency(
          splitTotal
        )}) must equal the year total (${formatCurrency(yearPool)})`
      );
    }

    // guard: every installment must have a due date
    for (let i = 0; i < workingInstallments.length; i++) {
      if (!workingInstallments[i].dueDate) {
        return toast.error(
          `Installment #${workingInstallments[i].number}: Due date is required`
        );
      }
    }

    const instituteId = student?.instituteId;
    const resolvedProgramId =
      programId || student?.programId || selectedYearData?.courseId;

    if (!instituteId) {
      return toast.error("Institute id missing");
    }
    if (!resolvedProgramId) {
      return toast.error("Program id missing");
    }

    try {
      setLoading(true);

      /* Build per-installment payload (renumber 1..N) */
      const installments = activeOption.installments.map((inst, idx) => {
        const view = installmentViews[idx];
        const originalPayable = view?.amount ?? getOriginalPayable(inst);
        const alreadyPaid = Number(inst.paidAmount || 0);
        const isPaid = inst.status === "paid";

        // persist the CUMULATIVE applied amount, not just the new delta
        const existingApplied = Number(inst.appliedNow || 0);
        const newApplied = view?.applied ?? 0;
        const totalApplied = round2(existingApplied + newApplied);

        const reducedPayable = isPaid
          ? originalPayable
          : round2(Math.max(originalPayable - totalApplied, 0));

        const instPayload: {
          number: number;
          amount: number;
          tuitionFee: number;
          otherFee: number;
          dueDate: string;
          status?: string;
          paidAmount?: number;
          paidDate?: string | null;
          paymentId?: string | null;
          concessionPercentage?: number;
          tuitionConcession?: number;
          otherFeeConcession?: number;
          payableAmount?: number;
          appliedNow?: number;
        } = {
          number: idx + 1, // renumber 1..N for the backend
          amount: Number(inst.amount || 0),
          tuitionFee: Number(inst.tuitionFee || 0),
          otherFee: Number(inst.otherFee || 0),
          dueDate: inst.dueDate,
          status: isPaid ? "paid" : "pending",
          paidAmount: alreadyPaid,
          concessionPercentage: Number(
            inst.concessionPercentage ?? concessionPercentage
          ),
          tuitionConcession: Number(
            view?.tuitionConcession ?? inst.tuitionConcession ?? 0
          ),
          otherFeeConcession: 0,
          payableAmount: reducedPayable,
          appliedNow: totalApplied,
        };

        if (isPaid && inst.paidDate) {
          instPayload.paidDate = inst.paidDate;
        }
        if (isPaid && inst.paymentId) {
          instPayload.paymentId = inst.paymentId;
        }

        return instPayload;
      });

      const paymentOptionPayload: UpsertStudentFeeStructurePayload["paymentOption"] =
      {
        paymentOptionId: activeOption.paymentOptionId,
        type: activeOption.type,
        name: activeOption.name,
        installments,
      };

      const payload: UpsertStudentFeeStructurePayload = {
        studentId,
        programId: resolvedProgramId,
        instituteId,
        year: Number(year),
        academicYear: effectiveAcademicYear,
        courseName: selectedYearData?.courseName || "",

        totalAmount: effectiveBaseTotal,
        tuitionFee: effectiveTuitionFee,
        otherFee: effectiveOtherFee,
        otherFeeDescription: selectedYearData?.otherFeeDescription || "",

        concessionPercentage,
        tuitionConcession: effectiveTuitionConcession,
        otherFeeConcession: 0,
        concessionAmount: effectiveTuitionConcession,
        concessionName: selectedYearData?.concessionName || "",
        appliedReferrals: selectedYearData?.appliedReferrals || [],

        paymentOption: paymentOptionPayload,

        givenAmount: entriesEnabled ? totalGivenAmount : 0,
        givenEntries: givenEntriesPayload,

        offer: !!appliedPreset,
      };

      console.log("🟢 Upsert Student Fee Structure Payload →", payload);

      const res = await upsertStudentFeeStructureRequest(payload);

      if (!res.success) {
        throw new Error(res.message || "Failed to save");
      }

      toast.success(
        res.message ||
        (isEditing
          ? "Given amount updated successfully"
          : "Given amount added successfully")
      );

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Upsert failed:", error);
      toast.error(error?.message || "Failed to save given amount");
    } finally {
      setLoading(false);
    }
  };

  const studentName = student
    ? `${student.firstname ?? ""} ${student.lastname ?? ""}`.trim()
    : "";

  const splitMatches =
    Math.abs(
      round2(workingTuitionPool + workingOtherPool) -
      round2(effectiveTuitionFee + effectiveOtherFee)
    ) <= 0.01;

  /** All form controls are disabled when the plan is fully paid. */
  const formDisabled = loading || allPaid;

  /** A specific installment's due date is editable only while pending. */
  const isDueDateEditable = (inst: InstallmentView) =>
    !formDisabled && !planLocked && !inst.isPaid;

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
            className="bg-white w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Fees Structure
                </h2>

                {studentName && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">
                      {studentName}
                    </span>
                    {student?.studentId && (
                      <span className="text-[10px] text-gray-400">
                        • {student.studentId}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-0.5">
                  {isEditing
                    ? `Editing existing entry for Year ${year}`
                    : "Add payment details for a specific year"}
                  {effectiveAcademicYear ? ` • ${effectiveAcademicYear}` : ""}
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
              {/* Fully-paid lock banner */}
              {allPaid && (
                <div className="flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3">
                  <Lock className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-green-800">
                      All installments are paid
                    </p>
                    <p className="text-green-700 mt-0.5">
                      This fee structure is locked. No further edits or saves
                      are allowed.
                    </p>
                  </div>
                </div>
              )}

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
                      {String(y.value) === String(student?.year)
                        ? "  •  (current)"
                        : ""}
                      {y.hasEntry ? "  •  (already added)" : ""}
                      {y.hasSnapshot && !y.hasEntry ? "  •  (snapshot)" : ""}
                    </option>
                  ))}
                </select>

                {year && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isEditing && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Pencil className="w-3 h-3" />
                        Editing existing entry
                      </span>
                    )}

                    {hasSnapshot && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Student fee snapshot exists
                      </span>
                    )}

                    {appliedPreset && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        <Wallet className="w-3 h-3" />
                        {appliedPreset.label} applied
                      </span>
                    )}

                    {concessionMeta.paymentOptionId && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        Concession Option: {concessionMeta.paymentOptionId}
                        {" • "}
                        {concessionMeta.paymentMode === "full_payment"
                          ? "Full Payment"
                          : `${concessionMeta.allowedInstallmentCount} installment${concessionMeta.allowedInstallmentCount > 1
                            ? "s"
                            : ""
                          }`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Fee Structure */}
              {selectedYearData && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                    <Info className="w-4 h-4" />
                    {hasSnapshot
                      ? "Fee Structure (Snapshot)"
                      : "Fee Structure (Configuration)"}
                  </div>

                  {/* Applied referrals */}
                  {selectedYearData.appliedReferrals &&
                    selectedYearData.appliedReferrals.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-600">
                          Applied Referrals:
                        </span>
                        {selectedYearData.appliedReferrals.map((r) => (
                          <span
                            key={r.referralId}
                            className="text-[10px] bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full"
                          >
                            {r.name} ({r.percentage}%)
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Fee summary */}
                  <div className="rounded-md border border-blue-200 bg-white p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-blue-900">
                        Fee Summary
                      </span>

                      {/* ✅ Vijayadashami button only for the allowed institute */}
                      {isVijayInstitute && (
                        <button
                          type="button"
                          onClick={applyVijayDashami}
                          disabled={!canApplyVijayPreset}
                          className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            activePresetDefinition
                              ? `Apply ${activePresetDefinition.label
                              } (${formatCurrency(
                                activePresetDefinition.tuitionFee
                              )} tuition + ${formatCurrency(
                                activePresetDefinition.otherFee
                              )} other, AY ${effectiveAcademicYear})`
                              : `No Vijayadashami preset configured for AY ${effectiveAcademicYear || "—"
                              }`
                          }
                        >
                          <Wallet className="w-3 h-3" />
                          Apply Vijayadashami
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <span className="text-gray-500">Course</span>
                      <span className="font-medium">
                        {selectedYearData.courseName || "—"}
                      </span>

                      <span className="text-gray-600">Tuition Fee</span>
                      <span className="font-medium text-gray-800">
                        {formatCurrency(effectiveTuitionFee)}
                      </span>

                      {effectiveTuitionConcession > 0 && (
                        <>
                          <span className="text-green-700 pl-3">
                            ↳ Concession ({concessionPercentage}%)
                          </span>
                          <span className="font-semibold text-green-700">
                            −{formatCurrency(effectiveTuitionConcession)}
                          </span>

                          <span className="text-gray-600 pl-3">
                            ↳ Tuition After Concession
                          </span>
                          <span className="font-semibold text-blue-800">
                            {formatCurrency(effectiveDiscountedTuition)}
                          </span>
                        </>
                      )}

                      <span className="text-gray-600 border-t border-gray-200 pt-1">
                        Other Fee
                      </span>
                      <span className="font-medium text-gray-800 border-t border-gray-200 pt-1">
                        {formatCurrency(effectiveOtherFee)}
                      </span>

                      <span className="text-gray-500 border-t border-blue-200 pt-1">
                        Base Total
                      </span>
                      <span className="font-medium border-t border-blue-200 pt-1">
                        {formatCurrency(effectiveBaseTotal)}
                      </span>

                      <span className="text-blue-900 font-semibold border-t border-blue-200 pt-1">
                        Total Payable
                      </span>
                      <span className="font-bold text-blue-900 border-t border-blue-200 pt-1">
                        {formatCurrency(yearTotalPayable)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Option toggle */}
                  {(hasFullOption || hasInstallmentOption) &&
                    availableOptions.length > 0 && (
                      <div className="pt-1">
                        <span className="block text-[11px] font-medium text-gray-600 mb-1.5">
                          Payment Option
                        </span>
                        <div className="inline-flex rounded-lg border border-blue-200 bg-white p-0.5 shadow-sm">
                          {hasFullOption && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOptionType("full_payment")
                              }
                              disabled={allPaid}
                              className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${selectedOptionType === "full_payment"
                                ? "bg-blue-600 text-white shadow"
                                : "text-gray-600 hover:bg-blue-50"
                                } disabled:opacity-50`}
                            >
                              Full Payment
                            </button>
                          )}
                          {hasInstallmentOption && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOptionType("installment")
                              }
                              disabled={allPaid}
                              className={`px-4 py-1.5 text-xs font-medium rounded-md transition ${selectedOptionType === "installment"
                                ? "bg-blue-600 text-white shadow"
                                : "text-gray-600 hover:bg-blue-50"
                                } disabled:opacity-50`}
                            >
                              Installment
                            </button>
                          )}
                        </div>
                        {activeOption && (
                          <p className="mt-1 text-[10px] text-gray-500">
                            {activeOption.name}
                            {" • "}
                            {activeOption.installments.length} installment
                            {activeOption.installments.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    )}

                  {/* Installments */}
                  {installmentViews.length > 0 && activeOption && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-900">
                          {activeOption.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">
                            {totalInstallments} installment
                            {totalInstallments > 1 ? "s" : ""}
                            {coveredCount > 0 &&
                              ` • ${coveredCount} covered`}
                          </span>
                          {planLocked &&
                            activeOption.type === "installment" && (
                              <span className="text-[10px] text-gray-500 italic">
                                Locked — payment already made
                              </span>
                            )}
                          {canAddInstallment && (
                            <button
                              type="button"
                              onClick={addInstallment}
                              disabled={loading || fetching}
                              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                              title="Add another installment"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Split-vs-year summary (read-only) */}
                      <div className="flex flex-wrap items-center justify-between gap-1 px-1 text-[10px]">
                        <span
                          className={
                            splitMatches
                              ? "text-gray-600"
                              : "text-red-600 font-semibold"
                          }
                        >
                          Split total:{" "}
                          <span className="font-semibold">
                            {formatCurrency(
                              round2(workingTuitionPool + workingOtherPool)
                            )}
                          </span>
                        </span>
                        <span className="text-gray-600">
                          Year total:{" "}
                          <span className="font-semibold">
                            {formatCurrency(
                              round2(
                                effectiveTuitionFee + effectiveOtherFee
                              )
                            )}
                          </span>
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {installmentViews.map((inst, idx) => (
                          <div
                            key={`${inst.number}-${idx}`}
                            className={`rounded-md border px-3 py-2 text-xs space-y-1.5 ${inst.isPaid
                              ? "bg-green-50 border-green-200"
                              : inst.isFullyCovered
                                ? "bg-blue-50 border-blue-200"
                                : inst.totalApplied > 0
                                  ? "bg-amber-50 border-amber-200"
                                  : "bg-white border-gray-200"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800">
                                  #{inst.number}
                                  {inst.optionType === "full_payment"
                                    ? " (Full)"
                                    : ""}
                                </span>
                                {/* ✅ Editable due date */}
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[10px] text-gray-500">
                                    Due
                                  </span>
                                  <input
                                    type="date"
                                    value={toInputDate(inst.dueDate)}
                                    onChange={(e) =>
                                      updateInstallmentDueDate(
                                        inst.number,
                                        e.target.value
                                      )
                                    }
                                    disabled={!isDueDateEditable(inst)}
                                    className="border border-gray-300 rounded px-1.5 py-0.5 text-[10px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-100"
                                    title={
                                      inst.isPaid
                                        ? "Paid installment — date locked"
                                        : planLocked
                                          ? "Payment made — date locked"
                                          : "Edit due date"
                                    }
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-right">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-500">
                                    Payable
                                  </span>
                                  <span className="font-semibold text-gray-800">
                                    {formatCurrency(inst.amount)}
                                  </span>
                                </div>

                                {inst.isPaid ? (
                                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                    PAID
                                  </span>
                                ) : inst.isFullyCovered ? (
                                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                    COVERED
                                  </span>
                                ) : inst.totalApplied > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500">
                                      Applied{" "}
                                      {formatCurrency(inst.totalApplied)}
                                    </span>
                                    <span className="font-semibold text-orange-600">
                                      Left {formatCurrency(inst.remaining)}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500">
                                      Pending
                                    </span>
                                    <span className="font-medium text-gray-600">
                                      {formatCurrency(inst.remaining)}
                                    </span>
                                  </div>
                                )}

                                {canRemoveInstallment && !inst.isPaid && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeInstallment(inst.number)
                                    }
                                    disabled={loading}
                                    className="p-1 rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
                                    title="Remove installment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] border-t border-gray-200 pt-1.5 items-center">
                              <span className="text-gray-500">Tuition Fee</span>
                              <span className="text-right text-gray-700">
                                {formatCurrency(inst.tuitionFee)}
                              </span>

                              {inst.tuitionConcession > 0 && (
                                <>
                                  <span className="text-green-700 pl-2">
                                    ↳ Concession
                                  </span>
                                  <span className="text-right font-medium text-green-700">
                                    −{formatCurrency(inst.tuitionConcession)}
                                  </span>
                                </>
                              )}

                              <span className="text-gray-500">Other Fee</span>
                              <span className="text-right text-gray-700">
                                {formatCurrency(inst.otherFee)}
                              </span>

                              <span className="text-blue-900 font-semibold border-t border-gray-200 pt-0.5">
                                Payable
                              </span>
                              <span className="text-right font-semibold text-blue-900 border-t border-gray-200 pt-0.5">
                                {formatCurrency(inst.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Amount Details (optional toggle) */}
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Amount Details
                    </label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Optional — turn on to record the given amount as dated
                      entries.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={entriesEnabled}
                    onClick={() => {
                      if (allPaid) return;
                      const next = !entriesEnabled;
                      setEntriesEnabled(next);
                      if (next && entries.length === 0) {
                        setEntries([
                          { date: "", amount: "", description: "" },
                        ]);
                      }
                    }}
                    disabled={formDisabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${entriesEnabled ? "bg-blue-600" : "bg-gray-300"
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${entriesEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>

                {entriesEnabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        Entries <span className="text-red-500">*</span>
                      </span>
                      <button
                        type="button"
                        onClick={addEntry}
                        disabled={formDisabled}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
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
                              disabled={formDisabled}
                              className="p-1 rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">
                              Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={entry.date}
                              onChange={(e) =>
                                updateEntry(index, "date", e.target.value)
                              }
                              disabled={formDisabled}
                              required
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-500 mb-1">
                              Amount <span className="text-red-500">*</span>
                            </label>
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
                                  updateEntry(
                                    index,
                                    "amount",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter amount"
                                disabled={formDisabled}
                                required
                                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={entry.description}
                          onChange={(e) =>
                            updateEntry(index, "description", e.target.value)
                          }
                          placeholder="Enter description"
                          disabled={formDisabled}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    ))}

                    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">
                        Total Given Amount
                      </span>
                      <span className="text-base font-semibold text-blue-900">
                        {formatCurrency(totalGivenAmount)}
                      </span>
                    </div>
                  </>
                )}
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
                  disabled={loading || fetching || allPaid}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading
                    ? "Saving..."
                    : allPaid
                      ? "Locked"
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