"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import Select from "react-select";
import { City } from "country-state-city";
import {
  createSonaChamps,
  CreateSonaChampsData,
} from "@/app/lib/request/sonachamprequest";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ✅ Options
const CLASS_OPTIONS = [
  { value: "VI", label: "VI" },
  { value: "VII", label: "VII" },
  { value: "VIII", label: "VIII" },
  { value: "IX", label: "IX" },
  { value: "X", label: "X" },
  { value: "XI", label: "XI" },
  { value: "XII", label: "XII" },
];

const EVENT_OPTIONS = [
  { value: "Group Dance", label: "Group Dance" },
  { value: "Solo Dance", label: "Solo Dance" },
  { value: "Singing", label: "Singing" },
  { value: "Spell Bee", label: "Spell Bee" },
  { value: "Face Painting", label: "Face Painting" },
  { value: "Drawing / Painting", label: "Drawing / Painting" },
  { value: "Gaming", label: "Gaming" },
  { value: "Science Expo", label: "Science Expo" },
  { value: "Puzzle Quest", label: "Puzzle Quest" },
  { value: "Veg / Fruit Cravings", label: "Veg / Fruit Cravings" },
];

const CATEGORY_OPTIONS = [
  { value: "Junior", label: "Junior (VI - VIII STD)" },
  { value: "Senior", label: "Senior (IX - XII STD)" },
];

const EMPTY: CreateSonaChampsData = {
  studentName: "",
  class: "",
  gender: "Male",
  schoolName: "",
  schoolLocation: "",
  teacherCoordinatorName: "",
  teacherCoordinatorMobile: "",
  parentGuardianName: "",
  parentGuardianMobile: "",
  category: "Junior", // Default changed to match new UI
  event: "",
};

export default function SonaChampsFormModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<CreateSonaChampsData>(EMPTY);
  const [loading, setLoading] = useState(false);

  /* =========================
     Location State (City Only)
  ========================= */
  const COUNTRY_CODE = "IN";
  const STATE_CODE = "TN";

  const cityOptions = useMemo(() => {
    return City.getCitiesOfState(COUNTRY_CODE, STATE_CODE).map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, []);

  /* =========================
     Handlers
  ========================= */
  if (!open) return null;

  const set = <K extends keyof CreateSonaChampsData>(
    key: K,
    value: CreateSonaChampsData[K]
  ) => setForm((p) => ({ ...p, [key]: value }));

  const reset = () => {
    setForm(EMPTY);
  };

  // 🎯 Auto-Fetch Category Logic
  const handleClassChange = (selectedClass: string) => {
    set("class", selectedClass);

    const juniorClasses = ["VI", "VII", "VIII"];
    const seniorClasses = ["IX", "X", "XI", "XII"];

    if (juniorClasses.includes(selectedClass)) {
      set("category", "Junior");
    } else if (seniorClasses.includes(selectedClass)) {
      set("category", "Senior");
    }
  };

  const handleSubmit = async () => {
    if (!form.studentName.trim()) {
      toast.error("Student name is required");
      return;
    }
    if (!form.class) {
      toast.error("Please select a class");
      return;
    }
    if (!form.schoolLocation) {
      toast.error("Please select a city");
      return;
    }
    if (!form.event) {
      toast.error("Please select an event");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.teacherCoordinatorMobile)) {
      toast.error("Invalid teacher mobile (10 digits, starting 6-9)");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.parentGuardianMobile)) {
      toast.error("Invalid parent mobile (10 digits, starting 6-9)");
      return;
    }

    setLoading(true);
    try {
      const res = await createSonaChamps(form);
      toast.success(`Registered! Reg ID: ${res.regId}`);
      reset();
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]";
  const labelCls = "block text-xs font-medium text-gray-700 mb-1";

  // 🔴 Helper to render red star
  const RedStar = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-3xl space-y-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            reset();
            onClose();
          }}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-800">
          Register Student — SONA CHAMPS '26
        </h2>

        {/* Student Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Student Name <RedStar />
            </label>
            <input
              value={form.studentName}
              onChange={(e) => set("studentName", e.target.value)}
              className={inputCls}
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className={labelCls}>
              Class <RedStar />
            </label>
            <Select
              options={CLASS_OPTIONS}
              value={CLASS_OPTIONS.find((o) => o.value === form.class) || null}
              onChange={(val) => handleClassChange(val?.value || "")}
              placeholder="Choose"
              className="react-select-container text-sm"
              classNamePrefix="react-select"
              isClearable={false}
            />
          </div>

          <div>
            <label className={labelCls}>
              Gender <RedStar />
            </label>
            <select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value as any)}
              className={inputCls}
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        {/* School Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              School Name <RedStar />
            </label>
            <input
              value={form.schoolName}
              onChange={(e) => set("schoolName", e.target.value)}
              className={inputCls}
              placeholder="Enter school name"
            />
          </div>

          <div>
            <label className={labelCls}>
              School Location / City <RedStar />
            </label>
            <Select
              options={cityOptions}
              value={
                cityOptions.find((o) => o.value === form.schoolLocation) || null
              }
              onChange={(val) => set("schoolLocation", val?.value || "")}
              placeholder="Search city..."
              className="text-sm"
              classNamePrefix="react-select"
              isSearchable
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Type to search Tamil Nadu cities
            </p>
          </div>
        </div>

        {/* Teacher Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Teacher Coordinator Name <RedStar />
            </label>
            <input
              value={form.teacherCoordinatorName}
              onChange={(e) => set("teacherCoordinatorName", e.target.value)}
              className={inputCls}
              placeholder="Enter teacher name"
            />
          </div>
          <div>
            <label className={labelCls}>
              Teacher Mobile <RedStar />
            </label>
            <input
              value={form.teacherCoordinatorMobile}
              onChange={(e) =>
                set(
                  "teacherCoordinatorMobile",
                  e.target.value.replace(/\D/g, "").slice(0, 10)
                )
              }
              maxLength={10}
              className={`${inputCls} font-mono`}
              placeholder="10-digit number"
            />
          </div>
        </div>

        {/* Parent Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Parent / Guardian Name <RedStar />
            </label>
            <input
              value={form.parentGuardianName}
              onChange={(e) => set("parentGuardianName", e.target.value)}
              className={inputCls}
              placeholder="Enter parent name"
            />
          </div>
          <div>
            <label className={labelCls}>
              Parent Mobile <RedStar />
            </label>
            <input
              value={form.parentGuardianMobile}
              onChange={(e) =>
                set(
                  "parentGuardianMobile",
                  e.target.value.replace(/\D/g, "").slice(0, 10)
                )
              }
              maxLength={10}
              className={`${inputCls} font-mono`}
              placeholder="10-digit number"
            />
          </div>
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Category <RedStar />
            </label>
            <Select
              options={CATEGORY_OPTIONS}
              value={
                CATEGORY_OPTIONS.find((o) => o.value === form.category) || null
              }
              onChange={(val) => set("category", val?.value as any)}
              placeholder="Choose"
              className="text-sm"
              classNamePrefix="react-select"
              isSearchable={false}
            />
          </div>

          <div>
            <label className={labelCls}>
              Event <RedStar />
            </label>
            <Select
              options={EVENT_OPTIONS}
              value={
                EVENT_OPTIONS.find((o) => o.value === form.event) || null
              }
              onChange={(val) => set("event", val?.value || "")}
              placeholder="Choose"
              className="text-sm"
              classNamePrefix="react-select"
              isSearchable
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 mt-4 ${
            loading
              ? "bg-blue-400 cursor-not-allowed text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Registering...
            </>
          ) : (
            "Register Student"
          )}
        </button>
      </div>
    </div>
  );
}