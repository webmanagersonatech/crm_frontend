"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { User, X } from "lucide-react";
import { getStudentRequest, updateStudentIndividualRequest } from "@/app/lib/request/studentRequest";


interface Sibling {
    name: string;
    age: number;
    status: "studying" | "working" | "both" | "none";
}
interface StudentCleanupFormProps {
    studentid: string
    refetch: () => void
    onSuccess: () => void
}


interface FormState {
    quota: string;
    universityRegNo: string;

    internshipType: string;
    internshipCompany: string;
    internshipDuration: string;
    internshipRemarks: string;

    hostelWilling: "yes" | "no";
    hostelReason: string;

    bloodGroup: string;
    bloodDonate: boolean;

    familyOccupation: string;
    otherOccupation: string;

    siblingsCount: number;
    siblings: Sibling[];

    feedbackRating: "good" | "bad" | "worst" | "";
    feedbackReason: string;
}


const quotaOptions = [
    { value: "government", label: "Government Quota" },
    { value: "management", label: "Management Quota" },
    { value: "minority", label: "Minority Quota" },
    { value: "sports", label: "Sports Quota" },
    { value: "nri", label: "NRI Quota" },
    { value: "lateral", label: "Lateral Entry" },
    { value: "transfer", label: "Transfer Admission" },
    { value: "other", label: "Other" },
];

const bloodOptions = [
    "A+", "A-",
    "B+", "B-",
    "O+", "O-",
    "AB+", "AB-",
    "Unknown"
];


const occupationOptions = [
    { value: "farmer", label: "Farmer / Agriculture" },
    { value: "business", label: "Business" },
    { value: "private", label: "Private Employee" },
    { value: "government", label: "Government Employee" },
    { value: "self", label: "Self Employed" },
    { value: "daily_wage", label: "Daily Wage Worker" },
    { value: "homemaker", label: "Homemaker" },
    { value: "retired", label: "Retired" },
    { value: "unemployed", label: "Unemployed" },
    { value: "other", label: "Other" },
];


export default function StudentCleanupForm({
    studentid,
    refetch,
    onSuccess,
}: StudentCleanupFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [student, setStudent] = useState<any>(null);

    const [form, setForm] = useState<FormState>({
        quota: "",
        universityRegNo: "",
        internshipType: "",
        internshipCompany: "",
        internshipDuration: "",
        internshipRemarks: "",

        feedbackRating: "",
        feedbackReason: "",


        hostelWilling: "yes",
        hostelReason: "",

        bloodGroup: "",
        bloodDonate: false,

        familyOccupation: "",
        otherOccupation: "",

        siblingsCount: 0,
        siblings: [],
    });

    /* ===================== FETCH STUDENT ===================== */


    useEffect(() => {
        if (!studentid) return;

        const fetchStudent = async () => {
            try {
                const data = await getStudentRequest(studentid);
                setStudent(data);

                // ---------------- APPLICATION DATA ----------------
                const personalDetails = data?.application?.personalDetails || [];

                const personalSection = personalDetails.find(
                    (s: any) => s.sectionName === "Personal Details"
                );

                const siblingSection = personalDetails.find(
                    (s: any) => s.sectionName === "Sibling Details"
                );

                // -------- hostel (from application) --------
                const hostelFromApplication =
                    personalSection?.fields?.["Hostel Required"]?.toLowerCase() === "yes"
                        ? "yes"
                        : "no";

                // -------- blood group (from application) --------
                const bloodGroupFromApplication =
                    personalSection?.fields?.["Blood Group"] || "";

                // -------- siblings (from application) --------
                const siblingCountFromApplication = Number(
                    siblingSection?.fields?.["Sibling Count"] || 0
                );

                const siblingsFromApplication: {
                    name: string;
                    age: number;
                    status: "studying" | "none";
                }[] = [];

                if (siblingSection?.fields) {
                    Object.keys(siblingSection.fields).forEach((key) => {
                        if (key.startsWith("Sibling Name")) {
                            const index = key.replace("Sibling Name", "").trim() || "1";

                            siblingsFromApplication.push({
                                name:
                                    siblingSection.fields[
                                    `Sibling Name${index === "1" ? "" : " " + index}`
                                    ] || "",
                                age: Number(
                                    siblingSection.fields[
                                    `Sibling Age${index === "1" ? "" : " " + index}`
                                    ] || 0
                                ),
                                status:
                                    siblingSection.fields[
                                        `Sibling Studying${index === "1" ? "" : " " + index}`
                                    ] === "Yes"
                                        ? "studying"
                                        : "none",
                            });
                        }
                    });
                }

                // ---------------- FINAL FORM SET ----------------
                setForm({
                    quota: data.admissionQuota ?? "",
                    universityRegNo: data.admissionUniversityRegNo ?? "",

                    internshipType: data.internshipType ?? "",
                    internshipCompany: data.internshipCompany ?? "",
                    internshipDuration: data.internshipDuration ?? "",
                    internshipRemarks: data.internshipRemarks ?? "",

                    //  hostel: student true → application → no
                    hostelWilling:
                        data.hostelWilling === true ? "yes" : hostelFromApplication,

                    hostelReason: data.hostelReason ?? "",

                    //  blood group: student → application
                    bloodGroup:
                        data.bloodGroup && data.bloodGroup !== ""
                            ? data.bloodGroup
                            : bloodGroupFromApplication,

                    bloodDonate: data.bloodWilling ?? false,

                    familyOccupation: data.familyOccupation ?? "",
                    otherOccupation: data.familyOtherOccupation ?? "",

                    //  siblings count: student (>0) → application
                    siblingsCount:
                        data.siblingsCount && data.siblingsCount > 0
                            ? data.siblingsCount
                            : siblingCountFromApplication,

                    //  siblings list: student → application
                    siblings:
                        data.siblingsDetails && data.siblingsDetails.length > 0
                            ? data.siblingsDetails
                            : siblingsFromApplication,

                    feedbackRating: data.feedbackRating ?? "",
                    feedbackReason: data.feedbackReason ?? "",
                });
            } catch (error: any) {
                toast.error(error.message || "Failed to fetch student data");
            }
        };

        fetchStudent();
    }, [studentid]);





    /* ===================== HANDLERS ===================== */
    const handleChange = (key: keyof FormState, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSiblingChange = (i: number, key: keyof Sibling, value: any) => {
        const updatedSiblings = [...form.siblings];
        updatedSiblings[i] = { ...updatedSiblings[i], [key]: value };
        setForm(prev => ({ ...prev, siblings: updatedSiblings }));
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            admissionQuota: form.quota,
            admissionUniversityRegNo: form.universityRegNo,
            internshipType: form.internshipType,
            internshipCompany: form.internshipCompany,
            internshipDuration: form.internshipDuration,
            internshipRemarks: form.internshipRemarks,
            hostelWilling: form.hostelWilling === "yes",
            hostelReason: form.hostelReason,
            bloodGroup: form.bloodGroup,
            bloodWilling: form.bloodDonate,
            familyOccupation: form.familyOccupation,
            familyOtherOccupation: form.otherOccupation,
            siblingsCount: form.siblingsCount,
            siblingsDetails: form.siblings.map(s => ({
                name: s.name,
                age: s.age,
                status: s.status,
            })),
            feedbackRating: form.feedbackRating || undefined,
            feedbackReason: form.feedbackReason,
        };


        try {
            await updateStudentIndividualRequest(studentid, payload);

            toast.success("Student details updated successfully ");
            refetch()
            onSuccess()

        } catch (error: any) {
            toast.error(error.message || "Update failed");
        } finally {
            setLoading(false);
        }
    };



    /* ===================== STYLES ===================== */
    const inputClass =
        "border border-[#3a4480] p-2 rounded w-full focus:outline-none ";


    const labelClass = "block mb-1 font-medium text-gray-700";

    /* ===================== RENDER ===================== */
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 bg-white rounded-2xl shadow">
            {/* HEADER */}
            <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold"> Cleanup Student datas</h2>
            </div>

            {!student ? (
                <p>Loading student data...</p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ================= ADMISSION ================= */}
                    <section className="space-y-2 border p-4 rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-2">Admission Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className={labelClass}>Quota</label>
                                <select
                                    className={inputClass}
                                    value={form.quota}
                                    onChange={e => handleChange("quota", e.target.value)}
                                >
                                    <option value="">Select Quota</option>
                                    {quotaOptions.map(q => (
                                        <option key={q.value} value={q.value}>{q.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col">
                                <label className={labelClass}>University Reg No</label>
                                <input
                                    className={inputClass}
                                    value={form.universityRegNo}
                                    onChange={e => handleChange("universityRegNo", e.target.value)}
                                />
                            </div>
                        </div>
                    </section>


                    {/* ================= SIBLINGS ================= */}
                    <section className="space-y-4 border p-4 rounded-xl shadow-sm bg-gray-50">
                        <h3 className="font-semibold text-gray-800">Sibling Details</h3>

                        {/* COUNT */}
                        <div className="flex items-center gap-4">
                            <label className={labelClass}>Number of Siblings</label>
                            <input
                                type="number"
                                min={0}
                                className="w-24 border border-[#3a4480] p-2 rounded"
                                value={form.siblingsCount}
                                onChange={e => {
                                    const count = Number(e.target.value);
                                    handleChange("siblingsCount", count);
                                    handleChange(
                                        "siblings",
                                        Array.from({ length: count }, (_, i) =>
                                            form.siblings[i] || { name: "", age: 0, status: "none" }
                                        )
                                    );
                                }}
                            />
                        </div>

                        {/* SIBLING CARDS */}
                        <div className="space-y-3">
                            {form.siblings.map((sib, i) => (
                                <div
                                    key={i}
                                    className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
                                >
                                    {/* NAME */}
                                    <div>
                                        <label className={labelClass}>Name</label>
                                        <input
                                            className={inputClass}
                                            value={sib.name}
                                            onChange={e => handleSiblingChange(i, "name", e.target.value)}
                                        />
                                    </div>

                                    {/* AGE */}
                                    <div>
                                        <label className={labelClass}>Age</label>
                                        <input
                                            type="number"
                                            className={inputClass}
                                            value={sib.age}
                                            onChange={e => handleSiblingChange(i, "age", Number(e.target.value))}
                                        />
                                    </div>

                                    {/* STATUS */}
                                    <div>
                                        <label className={labelClass}>Status</label>
                                        <div className="flex flex-wrap gap-3 mt-2">
                                            {["studying", "working", "both", "none"].map(status => (
                                                <label
                                                    key={status}
                                                    className="flex items-center gap-1 text-sm cursor-pointer"
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`status-${i}`}
                                                        value={status}
                                                        checked={sib.status === status}
                                                        onChange={() => handleSiblingChange(i, "status", status)}
                                                    />
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ================= HOSTEL ================= */}
                    <section className="space-y-2 border p-4 rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-2">Hostel Preference</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className={labelClass}>Hostel Willing</label>
                                <select
                                    className={inputClass}
                                    value={form.hostelWilling}
                                    onChange={e => handleChange("hostelWilling", e.target.value)}
                                >
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </div>

                            {form.hostelWilling === "no" && (
                                <div className="md:col-span-2 flex flex-col">
                                    <label className={labelClass}>Reason</label>
                                    <input
                                        className={inputClass}
                                        value={form.hostelReason}
                                        onChange={e => handleChange("hostelReason", e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ================= BLOOD ================= */}
                    <section className="space-y-3 border p-4 rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-700">Blood Information</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="flex flex-col">
                                <label className={labelClass}>Blood Group</label>
                                <select
                                    className={inputClass}
                                    value={form.bloodGroup}
                                    onChange={e => handleChange("bloodGroup", e.target.value)}
                                >
                                    <option value="">Select Blood Group</option>
                                    {bloodOptions.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>

                            {/* TOGGLE */}
                            <div className="mt-2 md:mt-6">
                                <div className="flex items-center justify-between border p-3 rounded-md">
                                    <span className="font-medium text-gray-700">
                                        Willing to Donate Blood
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => handleChange("bloodDonate", !form.bloodDonate)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition
            ${form.bloodDonate ? "bg-blue-600" : "bg-gray-300"}`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition
              ${form.bloodDonate ? "translate-x-6" : "translate-x-1"}`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                    {/* ================= FAMILY ================= */}
                    <section className="space-y-2 border p-4 rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-700 mb-2">Family Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* OCCUPATION */}
                            <div className="flex flex-col">
                                <label className={labelClass}>Family Occupation</label>
                                <select
                                    className={inputClass}
                                    value={form.familyOccupation}
                                    onChange={e => handleChange("familyOccupation", e.target.value)}
                                >
                                    <option value="">Select Occupation</option>

                                    {occupationOptions.map(o => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* OTHER OCCUPATION */}
                            {form.familyOccupation === "other" && (
                                <div className="flex flex-col">
                                    <label className={labelClass}>Other Occupation</label>
                                    <input
                                        className={inputClass}
                                        placeholder="Enter occupation"
                                        value={form.otherOccupation}
                                        onChange={e => handleChange("otherOccupation", e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                    {/* ================= INTERNSHIP ================= */}
                    <section className="space-y-3 border p-4 rounded-lg shadow-sm">
                        <h3 className="font-semibold text-gray-700">Internship Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Internship Type</label>
                                <select
                                    className={inputClass}
                                    value={form.internshipType}
                                    onChange={e => handleChange("internshipType", e.target.value)}
                                >
                                    <option value="">Select Type</option>
                                    <option value="industrial">Industrial</option>
                                    <option value="academic">Academic</option>
                                    <option value="research">Research</option>
                                    <option value="none">Not Done</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Company / Organization</label>
                                <input
                                    className={inputClass}
                                    value={form.internshipCompany}
                                    onChange={e => handleChange("internshipCompany", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Duration</label>
                                <input
                                    className={inputClass}
                                    placeholder="Eg: 1 Month / 6 Weeks"
                                    value={form.internshipDuration}
                                    onChange={e => handleChange("internshipDuration", e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Remarks</label>
                                <textarea
                                    rows={2}
                                    className={inputClass}
                                    value={form.internshipRemarks}
                                    onChange={e => handleChange("internshipRemarks", e.target.value)}
                                />
                            </div>
                        </div>
                    </section>







                    {/* ================= STUDENT FEEDBACK ================= */}
                    <section className="space-y-3 border p-4 rounded-lg shadow-sm bg-gray-50">
                        <h3 className="font-semibold text-gray-800">Student Feedback</h3>

                        <div>
                            <label className={labelClass}>Overall Experience</label>

                            <div className="flex gap-6 mt-2">
                                {[
                                    { value: "good", label: "😊 Good" },
                                    { value: "bad", label: "😐 Bad" },
                                    { value: "worst", label: "😞 Worst" },
                                ].map(opt => (
                                    <label
                                        key={opt.value}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name="feedback"
                                            value={opt.value}
                                            checked={form.feedbackRating === opt.value}
                                            onChange={() => handleChange("feedbackRating", opt.value)}
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {form.feedbackRating && (
                            <div>
                                <label className={labelClass}>Why?</label>
                                <textarea
                                    rows={3}
                                    className={inputClass}
                                    placeholder="Explain reason..."
                                    value={form.feedbackReason}
                                    onChange={e => handleChange("feedbackReason", e.target.value)}
                                />
                            </div>
                        )}
                    </section>



                    {/* ================= ACTIONS ================= */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-gray-400 text-white rounded"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
