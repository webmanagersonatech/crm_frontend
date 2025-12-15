"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Select from "react-select";
import toast from "react-hot-toast";
import { Star, User, BookOpen, Pencil } from "lucide-react";
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest";
import {
    getActiveInstitutions,
} from "@/app/lib/request/institutionRequest";
import {
    getFormByInstituteId,
} from "@/app/lib/request/formManager";
import {
    getApplicationById,
    updateApplication,
} from "@/app/lib/request/application";

interface OptionType {
    value: string;
    label: string;
}

export default function EditApplicationPage() {
    const { id } = useParams();
    const router = useRouter();
    const [role, setRole] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [institutions, setInstitutions] = useState<OptionType[]>([]);
    const [selectedInstitute, setSelectedInstitute] = useState<string>("");
    const [formConfig, setFormConfig] = useState<any>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [files, setFiles] = useState<Record<string, File | null>>({});
    const [programOptions, setProgramOptions] = useState<OptionType[]>([]);
    const [program, setProgram] = useState("");

    const inputClass =
        "border border-gray-300 dark:border-neutral-700 p-2 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.log("No token found, skipping API call");
            return;
        }

        try {
            const payload = token.split(".")[1];
            const decoded: any = JSON.parse(atob(payload));
            // 🔹 Extract role from decoded JWT
            setRole(decoded.role || "");
        } catch (error) {
            console.error("Error decoding token:", error);
        }
    }, []);

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

    /** 🔹 Load Application Data */
    useEffect(() => {
        const fetchApplication = async () => {
            if (!id) return;
            try {
                const res = await getApplicationById(id as string);
                const app = res.data;
                setSelectedInstitute(app.instituteId);
                setProgram(app.program)
                setFormData({
                    ...app.personalData,
                    ...app.educationData,
                });
            } catch (error: any) {
                toast.error(error.message || "Failed to load application details");
            }
        };
        fetchApplication();
    }, [id]);

    /** 🔹 Load Form Fields for Selected Institute */
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
    const handleProgramChange = (selected: any) => {
        setProgram(selected ? selected.value : ""); // 👈 update program state
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
                                className={`cursor-pointer ${r <= value
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"
                                    }`}
                            />
                        ))}
                    </div>
                );

            case "file":
                const existingFile = formData[fieldName]; // e.g., image filename from DB
                const fileUrl = existingFile
                    ? `http://localhost:4000/uploads/${existingFile}`
                    : null;

                return (
                    <div key={i} className="flex flex-col gap-2">
                        {fileUrl && (
                            <div className="flex flex-col items-start">
                                <p className="text-xs text-gray-500">Current file:</p>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 underline text-sm"
                                >
                                    View
                                </a>

                                {/* If it's an image, show thumbnail */}
                                {/\.(jpg|jpeg|png|gif)$/i.test(existingFile) && (
                                    <img
                                        src={fileUrl}
                                        alt={fieldName}
                                        className="w-32 h-32 object-cover rounded border border-gray-200 mt-1"
                                    />
                                )}
                            </div>
                        )}

                        <input
                            type="file"
                            name={fieldName}
                            onChange={handleFileChange}
                            className="text-sm text-gray-600"
                        />
                    </div>
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

    /** 🔹 Submit Updated Application */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInstitute) return toast.error("Please select an institute");

        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append("instituteId", selectedInstitute);
            formDataToSend.append("academicYear", "2025-2026");
            formDataToSend.append("program", program);


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

            await updateApplication(id as string, formDataToSend, true);
            toast.success("Application updated successfully!");
            router.push("/applications");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || "Failed to update");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <Pencil className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Edit Application
                </h1>
            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow space-y-6"
            >
                {/* Institute Selection */}

                {role === "superadmin" && (
                    <div>
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                            Select Institute <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={institutions}
                            value={institutions.find((opt) => opt.value === selectedInstitute) || null}
                            onChange={(selected) => setSelectedInstitute(selected?.value || "")}
                            placeholder="Select Institute"
                            isClearable
                            isDisabled
                        />
                    </div>)}

                {selectedInstitute && (<div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Program <span className="text-red-500">*</span></label>
                    <Select
                        options={programOptions}
                        value={
                            programOptions.find((opt) => opt.value === program) || null
                        }
                        onChange={handleProgramChange}
                        placeholder="Select Program"
                        isClearable
                    />
                </div>)}

                {formConfig ? (
                    <>
                        {/* PERSONAL DETAILS SECTION */}
                        {formConfig?.personalFields?.length > 0 && (
                            <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                        Personal Details
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {formConfig.personalFields.map((field: any, i: number) => (
                                        <div key={i} className="flex flex-col">
                                            <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                                {field.fieldName}{" "}
                                                {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            {renderField(field, i)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* EDUCATIONAL DETAILS SECTION */}
                        {formConfig?.educationFields?.length > 0 && (
                            <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className="w-5 h-5 text-green-500" />
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                        Educational Details
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {formConfig.educationFields.map((field: any, i: number) => (
                                        <div key={`edu-${i}`} className="flex flex-col">
                                            <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                                {field.fieldName}{" "}
                                                {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            {renderField(field, i)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-center text-gray-500 mt-6">
                        No form available for the selected institute.
                    </p>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        type="button"
                        onClick={() => router.push("/applications")}
                        disabled={loading}
                        className={`px-4 py-2 rounded text-white transition ${loading
                            ? "bg-red-400 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600"
                            }`}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading || !formConfig}
                        className={`px-4 py-2 rounded text-white transition ${loading || !formConfig
                            ? "bg-blue-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {loading ? "Updating..." : "Update"}
                    </button>
                </div>
            </form>
        </div>
    );
}
