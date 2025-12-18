"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import toast from "react-hot-toast";
import { Star, User, BookOpen } from "lucide-react";

import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";

import { getFormByInstituteId } from "@/app/lib/request/formManager";
import { createApplication } from "@/app/lib/request/application";
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest";

interface OptionType {
    value: string;
    label: string;
}
type Step = "personal" | "education";

export default function AddapplicationForm({
    instituteId,
    LeadId,
    onSuccess,
    refetch,
}: {
    instituteId?: string;
    LeadId?: string;
    onSuccess?: () => void;
    refetch?: () => Promise<void>;
}) {

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [institutions, setInstitutions] = useState<OptionType[]>([]);
    const [selectedInstitute, setSelectedInstitute] = useState<string>("");
    const [formConfig, setFormConfig] = useState<any>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [files, setFiles] = useState<Record<string, File | null>>({});
    const [showinstituteDropdown, setShowinstituteDropdown] = useState(true);
    const [programOptions, setProgramOptions] = useState<OptionType[]>([]);
    const [program, setProgram] = useState("");
    const [activeTab, setActiveTab] = useState<"personal" | "education">("personal");


    const inputClass =
        "border border-gray-300 dark:border-neutral-700 p-2 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validatePersonalDetails = () => {
        if (!formConfig?.personalFields) return true;

        for (const field of formConfig.personalFields) {
            if (!field.required) continue;

            const value = formData[field.fieldName];

            // FILE
            if (field.fieldType === "file") {
                if (!files[field.fieldName]) {
                    toast.error(`${field.fieldName} is required`);
                    return false;
                }
                continue;
            }

            // EMPTY CHECK
            if (!value || value.toString().trim() === "") {
                toast.error(`${field.fieldName} is required`);
                return false;
            }

            // ✅ EMAIL FORMAT CHECK
            if (field.fieldType === "email") {
                if (!isValidEmail(value)) {
                    toast.error("Please enter a valid email address");
                    return false;
                }
            }
        }

        return true;
    };


    const validateEducationDetails = () => {
        if (!formConfig?.educationFields) return true;

        for (const field of formConfig.educationFields) {
            if (!field.required) continue;

            // FILE FIELD
            if (field.fieldType === "file") {
                if (!files[field.fieldName]) {
                    toast.error(`${field.fieldName} is required`);
                    return false;
                }
                continue;
            }

            const value = formData[field.fieldName];

            // NORMAL INPUT / SELECT / RADIO
            if (
                value === undefined ||
                value === null ||
                value.toString().trim() === ""
            ) {
                toast.error(`${field.fieldName} is required`);
                return false;
            }
        }

        return true;
    };





    const handleNext = () => {
        if (!validatePersonalDetails()) return;
        setActiveTab("education");
    };
    const handlePrev = () => {
        setActiveTab("personal");
    };




    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            toast.error("Not authorized: please log in.");
            return;
        }

        try {
            const payload = token.split(".")[1];
            const decoded: any = JSON.parse(atob(payload));


            const effectiveInstituteId = decoded.instituteId || instituteId;

            if (effectiveInstituteId) {
                setSelectedInstitute(effectiveInstituteId);
                setShowinstituteDropdown(false);
            } else {
                setShowinstituteDropdown(true);
            }
        } catch (error) {
            console.error("Failed to decode token:", error);
            setShowinstituteDropdown(true);
        }
    }, [instituteId]);

    /** 🔹 Load Institutions */
    useEffect(() => {
        const fetchInstitutions = async () => {
            try {
                const res = await getActiveInstitutions();
                const opts = res.map((inst: any) => ({
                    value: inst.instituteId,
                    label: inst.name,
                }));
                setInstitutions(opts);
            } catch {
                toast.error("Failed to load institutions");
            }
        };
        fetchInstitutions();
    }, []);

    /** 🔹 Load Form Fields When Institute Selected */
    useEffect(() => {
        const fetchForm = async () => {
            if (!selectedInstitute) return;
            try {
                const res = await getFormByInstituteId(selectedInstitute);
                const config = res?.data?.[0];
                if (!config) {
                    toast.error("No form configuration found for this institute");
                    setFormConfig(null);
                    return;
                }
                setFormConfig(config);
            } catch (error: any) {
                toast.error(error.message || "Failed to load form");
                setFormConfig(null);
            }
        };
        fetchForm();
    }, [selectedInstitute]);

    useEffect(() => {
        if (!selectedInstitute) {
            setProgramOptions([]);
            setProgram(""); // reset program
            return;
        }

        const loadPrograms = async () => {
            try {
                const settings = await getSettingsByInstitute(selectedInstitute);

                if (settings.courses && settings.courses.length) {
                    setProgramOptions(
                        settings.courses.map((course: string) => ({
                            value: course,
                            label: course,
                        }))
                    );
                } else {
                    setProgramOptions([]);
                    setProgram("");
                    toast.error("No courses found in institute settings.");
                }
            } catch (error) {
                console.error(error);
                setProgramOptions([]);
                setProgram("");
                toast.error("No courses found in institute settings.");
            }
        };

        loadPrograms();
    }, [selectedInstitute]);

    /** 🔹 Handle Input Changes */
    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const target = e.target;
        const { name, value, type } = target;

        if (type === "checkbox") {
            const checked = (target as HTMLInputElement).checked;
            setFormData((prev) => ({
                ...prev,
                [name]: checked ? value : "",
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    /** 🔹 Handle File Uploads */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: fileList } = e.target;
        const file = fileList?.[0];
        if (file) setFiles((prev) => ({ ...prev, [name]: file }));
    };

    /** 🔹 Render Dynamic Field */
    const renderField = (field: any, i: number) => {
        const { fieldType, fieldName, required, maxLength, options } = field;
        const value = formData[fieldName] || "";

        switch (fieldType) {
            case "text":
            case "number":
            case "email":
            case "date":
                return (
                    <input
                        key={i}
                        type={fieldType}
                        name={fieldName}
                        value={value}
                        maxLength={maxLength || undefined}
                        required={required}
                        onChange={handleChange}
                        className={inputClass}
                    />
                );
            case "textarea":
                return (
                    <textarea
                        key={i}
                        name={fieldName}
                        value={value}
                        required={required}
                        maxLength={maxLength || undefined}
                        onChange={handleChange}
                        className={inputClass}
                    />
                );

            case "select":
                return (
                    <select
                        key={i}
                        name={fieldName}
                        value={value}
                        required={required}
                        onChange={handleChange}
                        className={inputClass}
                    >
                        <option value="">Select...</option>
                        {options?.map((opt: string, idx: number) => (
                            <option key={idx} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                );

            case "radiobutton":
                return (
                    <div key={i} className="flex gap-3 items-center">
                        {options?.map((opt: string, idx: number) => (
                            <label key={idx} className="flex items-center gap-1">
                                <input
                                    type="radio"
                                    name={fieldName}
                                    value={opt}
                                    required={required}
                                    checked={value === opt}
                                    onChange={handleChange}
                                />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case "checkbox":
                return (
                    <div key={i} className="flex flex-wrap gap-3">
                        {options?.map((opt: string, idx: number) => (
                            <label key={idx} className="flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    name={fieldName}
                                    value={opt}
                                    onChange={handleChange}
                                    required={required}
                                />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case "rating":
                return (
                    <div key={i} className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((r) => (
                            <Star
                                key={r}
                                onClick={() =>
                                    setFormData((prev) => ({ ...prev, [fieldName]: r }))
                                }
                                className={`cursor-pointer ${r <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                    }`}
                            />
                        ))}
                    </div>
                );

            case "file":
                return (
                    <input
                        key={i}
                        type="file"
                        name={fieldName}
                        required={required}
                        onChange={handleFileChange}
                        className="text-sm text-gray-600"
                    />
                );

            case "textonly":
                return (
                    <p key={i} className="text-gray-600 dark:text-gray-300 italic">
                        {fieldName}
                    </p>
                );

            default:
                return null;
        }
    };
    const handleProgramChange = (selected: any) => {
        setProgram(selected ? selected.value : ""); // 👈 update program state
    };
    /** 🔹 Submit Handler */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInstitute) return toast.error("Please select an institute");
        if (!validatePersonalDetails()) {
            setActiveTab("personal");
            return;
        }

        if (!validateEducationDetails()) {
            setActiveTab("education");
            return;
        }
        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append("instituteId", selectedInstitute);
            formDataToSend.append("program", program);
            formDataToSend.append("academicYear", "2025-2026");


            if (LeadId) {
                formDataToSend.append("leadId", LeadId);
            }

            const personalData = formConfig.personalFields.reduce((acc: any, f: any) => {
                if (f.fieldType !== "file") acc[f.fieldName] = formData[f.fieldName] || "";
                return acc;
            }, {});
            const educationData = formConfig.educationFields.reduce((acc: any, f: any) => {
                acc[f.fieldName] = formData[f.fieldName] || "";
                return acc;
            }, {});

            formDataToSend.append("personalData", JSON.stringify(personalData));
            formDataToSend.append("educationData", JSON.stringify(educationData));

            Object.entries(files).forEach(([key, file]) => {
                if (file) formDataToSend.append(key, file);
            });

            await createApplication(formDataToSend, true);
            toast.success("Application submitted successfully!");

            if (refetch) {
                await refetch();
            }
            if (onSuccess) {
                onSuccess();
            } else {

                router.push("/applications");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || "Failed to submit");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div >

            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow space-y-6"
            >
                {/* Institute Selection */}
                {showinstituteDropdown && (
                    <div>
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                            Select Institute <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={institutions}
                            value={institutions.find(opt => opt.value === selectedInstitute) || null}
                            onChange={(selected) => setSelectedInstitute(selected?.value || "")}
                            placeholder="Select Institute"
                            isClearable
                        />
                    </div>
                )}

                {/* Program */}
                {selectedInstitute && (
                    <div>
                        <label className="text-sm font-semibold mb-1">
                            Program <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={programOptions}
                            value={programOptions.find(opt => opt.value === program) || null}
                            onChange={handleProgramChange}
                            placeholder="Select Program"
                            isClearable
                        />
                    </div>
                )}

                {/* TAB HEADER */}
                <div className="flex gap-4 border-b pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("personal")}
                        className={`px-4 py-2 font-semibold ${activeTab === "personal"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-500"
                            }`}
                    >
                        Personal Details
                    </button>

                    <button
                        type="button"
                        disabled
                        className={`px-4 py-2 font-semibold ${activeTab === "education"
                            ? "border-b-2 border-green-600 text-green-600"
                            : "text-gray-400 cursor-not-allowed"
                            }`}
                    >
                        Educational Details
                    </button>
                </div>

                {/* PERSONAL DETAILS TAB */}
                {activeTab === "personal" && formConfig?.personalFields?.length > 0 && (
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-5 h-5 text-blue-500" />
                            <h2 className="text-base font-semibold">Personal Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            {formConfig.personalFields.map((field: any, i: number) => (
                                <div key={i} className="flex flex-col space-y-0.5">
                                    <label className="text-xs font-semibold text-gray-600">
                                        {field.fieldName}
                                        {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {renderField(field, i)}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end mt-3">
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-4 py-1.5 bg-blue-600 text-sm text-white rounded hover:bg-blue-700"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}


                {/* EDUCATIONAL DETAILS TAB */}
                {activeTab === "education" && formConfig?.educationFields?.length > 0 && (
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-green-500" />
                            <h2 className="text-base font-semibold">Educational Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            {formConfig.educationFields.map((field: any, i: number) => (
                                <div key={i} className="flex flex-col space-y-0.5">
                                    <label className="text-xs font-semibold text-gray-600">
                                        {field.fieldName}
                                        {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {renderField(field, i)}
                                </div>
                            ))}
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="flex justify-end gap-2 mt-3">

                            <button
                                type="button"
                                onClick={handlePrev}
                                className="px-4 py-1.5 bg-gray-500 text-sm text-white rounded hover:bg-gray-600"
                            >
                                ← Previous
                            </button>

                            {!LeadId && (
                                <button
                                    type="button"
                                    onClick={() => router.push("/applications")}
                                    className="px-4 py-1.5 bg-red-500 text-sm text-white rounded hover:bg-red-600"
                                >
                                    Cancel
                                </button>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-1.5 bg-green-600 text-sm text-white rounded hover:bg-green-700 disabled:opacity-60"
                            >
                                {loading ? "Submitting..." : "Submit"}
                            </button>
                        </div>
                    </div>
                )}

            </form>



        </div>
    );
}
