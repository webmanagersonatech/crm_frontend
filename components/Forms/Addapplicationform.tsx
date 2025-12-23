"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Select from "react-select"
import toast, { Toaster } from "react-hot-toast"

import { getActiveInstitutions } from "@/app/lib/request/institutionRequest"
import { getFormByInstituteId } from "@/app/lib/request/formManager"
import { createApplication, getApplicationById, updateApplication } from "@/app/lib/request/application"
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest"

interface OptionType {
    value: string
    label: string
}

type Tab = "personal" | "education"

export default function AddApplicationForm({
    instituteId,
    LeadId,
    isEdit = false,
    applicationId,
    onSuccess,
    refetch,
}: {
    instituteId?: string
    applicationId?: string
    LeadId?: string
    isEdit?: boolean
    onSuccess?: () => void
    refetch?: () => Promise<void>
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [institutions, setInstitutions] = useState<OptionType[]>([])
    const [selectedInstitute, setSelectedInstitute] = useState("")
    const [programOptions, setProgramOptions] = useState<OptionType[]>([])
    const [program, setProgram] = useState("")
    const [formConfig, setFormConfig] = useState<any>(null)
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [files, setFiles] = useState<Record<string, File>>({})
    const [activeTab, setActiveTab] = useState<Tab>("personal")
    const [showCustomField, setShowCustomField] = useState(false)
    const [showInstituteDropdown, setShowInstituteDropdown] = useState(true)
    const [newField, setNewField] = useState({
        tab: "personal" as Tab,
        sectionName: "",
        fieldName: "",
        fieldType: "",
        options: "",
        required: false,
    })
    const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
    const BASE_URL = "http://localhost:4000/uploads/";
    const inputClass =
        "border border-gray-300 p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#5667a8]"


    useEffect(() => {
        const count = Number(formData["Sibling Count"]) || 0
        if (!formConfig) return

        const sections = formConfig.personalDetails
        const siblingSection = sections.find((s: any) => s.sectionName === "Sibling Details")
        if (!siblingSection) return

        // Remove previous dynamically added sibling fields (keeping the original 1 set)
        siblingSection.fields = siblingSection.fields.filter(
            (f: any) => !f.fieldName.match(/Sibling (Name|Age|Studying)\d+/)
        )

        // Append new sibling fields
        for (let i = 2; i <= count; i++) {
            siblingSection.fields.push(
                { fieldName: `Sibling Name${i}`, label: `Sibling Name ${i}`, type: "text", required: false, isCustom: true },
                { fieldName: `Sibling Age${i}`, label: `Sibling Age ${i}`, type: "number", required: false, isCustom: true },
                { fieldName: `Sibling Studying${i}`, label: `Sibling Studying ${i}`, type: "select", options: ["Yes", "No"], required: false, isCustom: true }
            )
        }

        setFormConfig({ ...formConfig })
    }, [formData["Sibling Count"]])


    // Load token-based institute
    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) return
        try {
            const payload = JSON.parse(atob(token.split(".")[1]))
            console.log(payload, "payload")
            if (payload?.instituteId) {
                setSelectedInstitute(payload.instituteId)
                setShowInstituteDropdown(false)
            }
        } catch {
            setShowInstituteDropdown(true)
        }
    }, [instituteId])

    useEffect(() => {
        if (!isEdit || !applicationId) return;

        getApplicationById(applicationId)
            .then((res) => {
                const app = res.data;

                // Set institute and program
                setSelectedInstitute(app.instituteId);
                setShowInstituteDropdown(false);
                setProgram(app.program);

                // Flatten application data for formData
                const flatData: Record<string, any> = {};
                app.personalDetails?.forEach((section: any) => {
                    Object.entries(section.fields).forEach(([k, v]) => {
                        flatData[k] = v;
                    });
                });
                app.educationDetails?.forEach((section: any) => {
                    Object.entries(section.fields).forEach(([k, v]) => {
                        flatData[k] = v;
                    });
                });
                setFormData(flatData);

                // Load original form config
                getFormByInstituteId(app.instituteId)
                    .then((res) => {
                        let config = res.data;
                        if (!config) return;

                        const mergeCustomFields = (tab: "personal" | "education", details: any[]) => {
                            details.forEach((section) => {
                                const targetSection = config[`${tab}Details`].find(
                                    (s: any) => s.sectionName === section.sectionName
                                );

                                if (targetSection) {
                                    Object.entries(section.fields).forEach(([key, value]) => {
                                        if (!targetSection.fields.some((f: any) => f.fieldName === key)) {
                                            targetSection.fields.push({
                                                fieldName: key,
                                                label: key,
                                                type:
                                                    typeof value === "string" &&
                                                        value.match(/\.(jpg|jpeg|png|webp|pdf|doc|docx)$/i)
                                                        ? "file"
                                                        : "text",
                                                required: false,
                                                isCustom: true,
                                            });
                                        }
                                    });
                                } else {
                                    // Section doesn't exist, create it
                                    config[`${tab}Details`].push({
                                        sectionName: section.sectionName,
                                        fields: Object.entries(section.fields).map(([key, value]) => ({
                                            fieldName: key,
                                            label: key,
                                            type:
                                                typeof value === "string" &&
                                                    value.match(/\.(jpg|jpeg|png|webp|pdf|doc|docx)$/i)
                                                    ? "file"
                                                    : "text",
                                            required: false,
                                            isCustom: true,
                                        })),
                                    });
                                }
                            });
                        };

                        mergeCustomFields("personal", app.personalDetails);
                        mergeCustomFields("education", app.educationDetails);

                        setFormConfig(config);
                    })
                    .catch(() => toast.error("Failed to load form config"));
            })
            .catch(() => toast.error("Failed to load application"));
    }, [isEdit, applicationId]);

    useEffect(() => {
        if (instituteId) {
            setSelectedInstitute(instituteId);
            setShowInstituteDropdown(false);
        }
    }, [instituteId]);

    // Load institutes
    useEffect(() => {
        getActiveInstitutions()
            .then((res) =>
                setInstitutions(
                    res.map((i: any) => ({ value: i.instituteId, label: i.name }))
                )
            )
            .catch(() => toast.error("Failed to load institutes"))
    }, [])

    const handleAddManualField = () => {
        const { tab, sectionName, fieldName, fieldType, options, required } = newField

        if (!sectionName || !fieldName || !fieldType) {
            toast.error("Section, field name and type are required")
            return
        }

        const sections = formConfig?.[`${tab}Details`] || []

        const targetSection = sections.find(
            (s: any) => s.sectionName === sectionName
        )

        if (!targetSection) {
            toast.error("Invalid section selected")
            return
        }

        // ❌ DUPLICATE CHECK (BEFORE setState)
        const alreadyExists = targetSection.fields.some(
            (f: any) =>
                f.fieldName.trim().toLowerCase() === fieldName.trim().toLowerCase()
        )

        if (alreadyExists) {
            toast.error("Field name already exists in this section")
            return
        }

        // ✅ SAFE STATE UPDATE
        setFormConfig((prev: any) => {
            const updatedSections = prev[`${tab}Details`].map((section: any) => {
                if (section.sectionName !== sectionName) return section

                return {
                    ...section,
                    fields: [
                        ...section.fields,
                        {
                            fieldName: fieldName.trim(),
                            label: fieldName.trim(),
                            type: fieldType,
                            required,

                            options:
                                ["select", "checkbox", "radiobutton"].includes(fieldType)
                                    ? options
                                        .split(",")
                                        .map((o) => o.trim())
                                        .filter(Boolean)
                                    : [],
                            multiple: fieldType === "checkbox",
                            isCustom: true,
                        },
                    ],
                }
            })

            return {
                ...prev,
                [`${tab}Details`]: updatedSections,
            }
        })

        toast.success("Field added")

        setNewField({
            tab,
            sectionName: "",
            fieldName: "",
            fieldType: "",
            options: "",
            required: false,
        })
    }



    const removeField = (tab: Tab, sectionName: string, fieldName: string) => {
        setFormConfig((prev: any) => {
            const sections = prev?.[`${tab}Details`] || []

            const updatedSections = sections.map((section: any) => {
                if (section.sectionName !== sectionName) return section

                return {
                    ...section,
                    fields: section.fields.filter(
                        (f: any) => f.fieldName !== fieldName
                    ),
                }
            })

            return {
                ...prev,
                [`${tab}Details`]: updatedSections,
            }
        })
    }




    // Load form config
    useEffect(() => {
        if (!selectedInstitute) return
        getFormByInstituteId(selectedInstitute)
            .then((res) => {
                if (!res?.data) {
                    toast.error("No form configuration found")
                    setFormConfig(null)
                    return
                }
                setFormConfig(res.data)
            })
            .catch(() => toast.error("Failed to load form"))
    }, [selectedInstitute])

    // Load programs
    useEffect(() => {
        if (!selectedInstitute) return
        getSettingsByInstitute(selectedInstitute)
            .then((res) => {
                if (!res?.courses?.length) {
                    toast.error("No programs found")
                    setProgramOptions([])
                    return
                }
                setProgramOptions(
                    res.courses.map((c: string) => ({ value: c, label: c }))
                )
            })
            .catch(() => toast.error("Failed to load programs"))
    }, [selectedInstitute])

    const validateProgram = () => {
        if (!program) {
            toast.error("Please select a program")
            return false
        }
        return true
    }

    // Validation for each section
    const validateSection = (sections?: any[]) => {
        if (!Array.isArray(sections)) return true

        for (const section of sections) {
            for (const field of section.fields || []) {
                if (!field.required) continue

                // File validation
                if (field.type === "file") {
                    // Check if a new file is uploaded OR existing value exists
                    if (!files[field.fieldName] && !formData[field.fieldName]) {
                        toast.error(`${field.fieldName} is required`)
                        return false
                    }
                    continue
                }


                const value = formData[field.fieldName]

                if (!value || value.toString().trim() === "") {
                    toast.error(`${field.fieldName} is required`)
                    return false
                }

                if (
                    field.type === "email" &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                ) {
                    toast.error("Invalid email format")
                    return false
                }
            }
        }
        return true
    }

    // Input handlers
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type, checked } = e.target as HTMLInputElement
        setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFiles((p) => ({ ...p, [e.target.name]: file }))
            setFormData((p) => ({ ...p, [e.target.name]: file.name }))
        }
    }


    const renderField = (field: any) => {
        const value = formData[field.fieldName] || (
            field.type === "checkbox" ? [] : ""
        )

        switch (field.type) {

            /* TEXTAREA */
            case "textarea":
                return (
                    <textarea
                        name={field.fieldName}
                        value={value}
                        onChange={handleChange}
                        className={inputClass}
                    />
                )

            /* SELECT */
            case "select":
                return (
                    <select
                        name={field.fieldName}
                        value={value}
                        onChange={handleChange}
                        className={inputClass}
                    >
                        <option value="">Select</option>
                        {field.options?.map((o: string) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                )

            /* RADIO BUTTON */
            case "radiobutton":
                return (
                    <div className="space-y-1">
                        {field.options?.map((o: string) => (
                            <label key={o} className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name={field.fieldName}
                                    value={o}
                                    checked={formData[field.fieldName] === o}
                                    onChange={() =>
                                        setFormData((p) => ({ ...p, [field.fieldName]: o }))
                                    }
                                />
                                {o}
                            </label>
                        ))}
                    </div>
                )

            /* CHECKBOX */
            case "checkbox":
                return (
                    <div className="space-y-1">
                        {field.options?.map((o: string) => (
                            <label key={o} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={(formData[field.fieldName] || []).includes(o)}
                                    onChange={(e) => {
                                        const prev = formData[field.fieldName] || []
                                        const updated = e.target.checked
                                            ? [...prev, o]
                                            : prev.filter((v: string) => v !== o)

                                        setFormData((p) => ({
                                            ...p,
                                            [field.fieldName]: updated,
                                        }))
                                    }}
                                />
                                {o}
                            </label>
                        ))}
                    </div>
                )

            /* FILE */
            case "file":
                const fileValue = formData[field.fieldName];
                const selectedFile = files[field.fieldName]; // actual File object
                const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : `${BASE_URL}${fileValue}`;
                const isImage =
                    selectedFile || (fileValue && IMAGE_EXTENSIONS.includes(fileValue.toString().split(".").pop()?.toLowerCase() || ""));

                return (
                    <div className="flex flex-col gap-2">
                        {isImage && previewUrl && (
                            <img
                                src={previewUrl}
                                alt={field.fieldName}
                                className="w-32 h-32 object-cover border rounded"
                            />
                        )}

                        {!isImage && fileValue && (
                            <a
                                href={`${BASE_URL}${fileValue}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                            >
                                {fileValue}
                            </a>
                        )}

                        <input
                            type="file"
                            name={field.fieldName}
                            onChange={handleFileChange}
                        />
                    </div>
                );


            /* DEFAULT INPUT */
            default:
                return (
                    <input
                        type={field.type}
                        name={field.fieldName}
                        value={value}
                        onChange={handleChange}
                        className={inputClass}
                        maxLength={field.maxLength || undefined}
                    />
                )
        }
    }


    // Navigation handlers
    const handleNext = () => {
        if (!validateSection(formConfig?.personalDetails)) return
        setActiveTab("education")
    }


    const handlePrev = () => {
        if (activeTab === "education") setActiveTab("personal")
    }

    const mapSectionData = (sections?: any[]) => {
        if (!Array.isArray(sections)) return []

        return sections.map((section) => {
            const sectionObj: any = {
                sectionName: section.sectionName,
                fields: {},
            }

            section.fields.forEach((field: any) => {
                if (field.type === "file") {
                    // Preserve old file if no new file uploaded
                    sectionObj.fields[field.fieldName] =
                        files[field.fieldName]?.name || formData[field.fieldName] || ""
                } else {
                    sectionObj.fields[field.fieldName] = formData[field.fieldName] || ""
                }
            })

            return sectionObj
        })
    }


    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedInstitute) {
            toast.error("Institute is required")
            return
        }

        if (!validateProgram()) return
        if (!validateSection(formConfig?.educationDetails)) return

        try {
            setLoading(true)

            const fd = new FormData()

            fd.append("instituteId", selectedInstitute)
            fd.append("program", program)
            fd.append("academicYear", "2025-2026")

            if (LeadId) fd.append("leadId", LeadId)

            fd.append(
                "personalDetails",
                JSON.stringify(mapSectionData(formConfig?.personalDetails))
            )

            fd.append(
                "educationDetails",
                JSON.stringify(mapSectionData(formConfig?.educationDetails))
            )

            Object.entries(files).forEach(([k, f]) => {
                fd.append(k, f)
            })

            if (isEdit && applicationId) {
                await updateApplication(applicationId, fd, true)
                toast.success("Application updated successfully")
            } else {
                await createApplication(fd, true)
                toast.success("Application submitted successfully")
            }

            await refetch?.()
            onSuccess ? onSuccess() : router.push("/applications")
        } catch (err: any) {
            toast.error(err?.message || "Submission failed")
        } finally {
            setLoading(false)
        }
    }



    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-6">
            <Toaster position="top-right" />

            {/* Institute */}
            {showInstituteDropdown && (
                <Select
                    options={institutions}
                    onChange={(o) => setSelectedInstitute(o?.value || "")}
                    placeholder="Select Institute"
                />
            )}

            {/* Program */}
            {selectedInstitute && (
                <Select
                    options={programOptions}
                    value={programOptions.find((p) => p.value === program) || null}
                    onChange={(o) => setProgram(o?.value || "")}
                    placeholder="Select Program"
                />

            )}
            <div className="flex items-center justify-between mb-4 p-3 border rounded bg-white">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                        Add Custom Field
                    </h3>
                    <p className="text-xs text-gray-500">
                        Enable to add manual fields to the form
                    </p>
                </div>

                {/* TOGGLE */}
                <button
                    type="button"
                    onClick={() => setShowCustomField(!showCustomField)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition
      ${showCustomField ? "bg-blue-600" : "bg-gray-300"}`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition
        ${showCustomField ? "translate-x-6" : "translate-x-1"}`}
                    />
                </button>
            </div>

            {/* MANUAL FIELD BUILDER */}
            {showCustomField && (
                <div className="border p-4 rounded bg-gray-50 space-y-4">
                    {/* HEADER */}
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            ➕ Add Custom Field
                        </h3>


                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* TAB */}
                        <select
                            className={inputClass}
                            value={newField.tab}
                            onChange={(e) =>
                                setNewField({ ...newField, tab: e.target.value as Tab })
                            }
                        >
                            <option value="personal">Personal</option>
                            <option value="education">Education</option>
                        </select>

                        {/* SECTION */}
                        <select
                            className={inputClass}
                            value={newField.sectionName}
                            onChange={(e) =>
                                setNewField({ ...newField, sectionName: e.target.value })
                            }
                        >
                            <option value="">Select Section</option>
                            {formConfig?.[`${newField.tab}Details`]?.map((s: any) => (
                                <option key={s.sectionName} value={s.sectionName}>
                                    {s.sectionName}
                                </option>
                            ))}
                        </select>

                        {/* FIELD NAME */}
                        <input
                            className={inputClass}
                            placeholder="Field Name"
                            value={newField.fieldName}
                            onChange={(e) =>
                                setNewField({ ...newField, fieldName: e.target.value })
                            }
                        />

                        {/* FIELD TYPE */}
                        <select
                            className={inputClass}
                            value={newField.fieldType}
                            onChange={(e) =>
                                setNewField({ ...newField, fieldType: e.target.value })
                            }
                        >
                            <option value="">Select Type</option>
                            <option value="text">Text</option>
                            <option value="file">File Upload</option>
                        </select>

                        {/* OPTIONS */}
                        {["select", "checkbox", "radiobutton"].includes(newField.fieldType) && (
                            <input
                                className={inputClass}
                                placeholder="Options (comma separated)"
                                value={newField.options}
                                onChange={(e) =>
                                    setNewField({ ...newField, options: e.target.value })
                                }
                            />
                        )}

                        {/* REQUIRED */}
                        <label className="flex gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={newField.required}
                                onChange={(e) =>
                                    setNewField({ ...newField, required: e.target.checked })
                                }
                            />
                            Required
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddManualField}
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        Add Field
                    </button>
                </div>
            )}



            {/* Step Form */}
            <div className="border p-4 rounded">
                <h2 className="font-semibold text-lg mb-3">
                    {activeTab === "personal" ? "Personal Details" : "Education Details"}
                </h2>

                {formConfig?.[`${activeTab}Details`]?.map((section: any) => (
                    <div key={section.sectionName} className="border p-3 rounded mb-4">
                        <h3 className="font-semibold mb-3">{section.sectionName}</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {section.fields.map((f: any) => (
                                <div
                                    key={f.fieldName}
                                    className="flex flex-col relative border rounded p-2"
                                >
                                    {/* ❌ REMOVE BUTTON (only for manually added fields) */}
                                    {f.isCustom && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeField(activeTab, section.sectionName, f.fieldName)
                                            }
                                            className="absolute top-1 right-1 text-red-600 font-bold text-sm"
                                            title="Remove field"
                                        >
                                            ✕
                                        </button>
                                    )}

                                    <label className="text-xs font-semibold mb-1">
                                        {f.fieldName}
                                        {f.required && <span className="text-red-500"> *</span>}
                                    </label>

                                    {renderField(f)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-end gap-2">
                {activeTab === "education" && (
                    <button type="button" onClick={handlePrev} className="px-4 py-2 bg-gray-500 text-white rounded">
                        ← Previous
                    </button>
                )}
                {activeTab === "personal" && (
                    <button type="button" onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded">
                        Next →
                    </button>
                )}
                {activeTab === "education" && (
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                )}
            </div>
        </form>
    )
}
