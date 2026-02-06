"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Select from "react-select"
import { toast } from "react-toastify";

import { getActiveInstitutions } from "@/app/lib/request/institutionRequest"
import { getFormByInstituteId } from "@/app/lib/request/formManager"
import { createApplication, getApplicationById, updateApplication } from "@/app/lib/request/application"
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest"

type Tab = "personal" | "education"

interface OptionType {
    value: string
    label: string
}

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

    const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
    const BASE_URL = "http://localhost:4000/uploads/"
    const inputClass =
        "border border-gray-300 p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#5667a8]"

    // Load token-based institute
    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) return
        try {
            const payload = JSON.parse(atob(token.split(".")[1]))
            if (payload?.instituteId) {
                setSelectedInstitute(payload.instituteId)
                setShowInstituteDropdown(false)
            }
        } catch {
            setShowInstituteDropdown(true)
        }
    }, [instituteId])

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

    // Load formConfig
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

    // Load application on edit AFTER formConfig is loaded
    useEffect(() => {
        if (!isEdit || !applicationId || !formConfig) return

        getApplicationById(applicationId)
            .then((res) => {
                const app = res.data
                setSelectedInstitute(app.instituteId)
                setShowInstituteDropdown(false)
                setProgram(app.program)

                const flatData: Record<string, any> = {}

                const mergeCustomFields = (sections: any[], type: Tab) => {
                    sections.forEach((section: any) => {
                        const configSections = formConfig?.[`${type}Details`] || []
                        const configSection = configSections.find((s: any) => s.sectionName === section.sectionName)
                        if (!configSection) return

                        Object.entries(section.fields).forEach(([k, v]) => {
                            flatData[k] = v

                            const exists = configSection.fields.some((f: any) => f.fieldName === k)
                            if (!exists) {
                                configSection.fields.push({
                                    fieldName: k,
                                    label: k,
                                    type: typeof v === "string" && v.match(/\.(jpg|jpeg|png|webp|pdf)$/) ? "file" : "text",
                                    required: false,
                                    isCustom: true,
                                })
                            }
                        })
                    })
                }

                mergeCustomFields(app.personalDetails, "personal")
                mergeCustomFields(app.educationDetails, "education")

                setFormData(flatData)
                setFormConfig((prev: any) => ({ ...prev })) // trigger re-render
            })
            .catch(() => toast.error("Failed to load application"))
    }, [isEdit, applicationId, formConfig])

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
        const value = formData[field.fieldName] || (field.type === "checkbox" ? [] : "")

        switch (field.type) {
            case "textarea":
                return <textarea name={field.fieldName} value={value} onChange={handleChange} className={inputClass} />
            case "select":
                return (
                    <select name={field.fieldName} value={value} onChange={handleChange} className={inputClass}>
                        <option value="">Select</option>
                        {field.options?.map((o: string) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                )
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
                                        const updated = e.target.checked ? [...prev, o] : prev.filter((v: string) => v !== o)
                                        setFormData((p) => ({ ...p, [field.fieldName]: updated }))
                                    }}
                                />
                                {o}
                            </label>
                        ))}
                    </div>
                )
            case "file":
                const fileValue = formData[field.fieldName]
                const selectedFile = files[field.fieldName]
                const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : `${BASE_URL}${fileValue}`
                const isImage =
                    selectedFile || (fileValue && IMAGE_EXTENSIONS.includes(fileValue.toString().split(".").pop()?.toLowerCase() || ""))

                return (
                    <div className="flex flex-col gap-2">
                        {isImage && previewUrl && (
                            <img src={previewUrl} alt={field.fieldName} className="w-32 h-32 object-cover border rounded" />
                        )}
                        {!isImage && fileValue && (
                            <a href={`${BASE_URL}${fileValue}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                {fileValue}
                            </a>
                        )}
                        <input type="file" name={field.fieldName} onChange={handleFileChange} />
                    </div>
                )
            default:
                return <input type={field.type} name={field.fieldName} value={value} onChange={handleChange} className={inputClass} />
        }
    }

    // Navigation & validation
    const validateProgram = () => {
        if (!program) {
            toast.error("Please select a program")
            return false
        }
        return true
    }

    const validateSection = (sections?: any[]) => {
        if (!Array.isArray(sections)) return true
        for (const section of sections) {
            for (const field of section.fields || []) {
                if (!field.required) continue
                if (field.type === "file" && !files[field.fieldName]) {
                    toast.error(`${field.fieldName} is required`)
                    return false
                }
                const value = formData[field.fieldName]
                if (!value || value.toString().trim() === "") {
                    toast.error(`${field.fieldName} is required`)
                    return false
                }
                if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    toast.error("Invalid email format")
                    return false
                }
            }
        }
        return true
    }

    const mapSectionData = (sections?: any[]) => {
        if (!Array.isArray(sections)) return []
        return sections.map((section) => {
            const sectionObj: any = { sectionName: section.sectionName, fields: {} }
            section.fields.forEach((field: any) => {
                sectionObj.fields[field.fieldName] = field.type === "file"
                    ? files[field.fieldName]?.name || formData[field.fieldName] || ""
                    : formData[field.fieldName] || ""
            })
            return sectionObj
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedInstitute) return toast.error("Institute is required")
        if (!validateProgram()) return
        if (!validateSection(formConfig?.educationDetails)) return

        try {
            setLoading(true)
            const fd = new FormData()
            fd.append("instituteId", selectedInstitute)
            fd.append("program", program)
            fd.append("academicYear", "2025-2026")
            if (LeadId) fd.append("leadId", LeadId)
            fd.append("personalDetails", JSON.stringify(mapSectionData(formConfig?.personalDetails)))
            fd.append("educationDetails", JSON.stringify(mapSectionData(formConfig?.educationDetails)))
            Object.entries(files).forEach(([k, f]) => fd.append(k, f))

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
            

            {showInstituteDropdown && (
                <Select
                    options={institutions}
                    onChange={(o) => setSelectedInstitute(o?.value || "")}
                    placeholder="Select Institute"
                />
            )}

            {selectedInstitute && (
                <Select
                    options={programOptions}
                    value={programOptions.find((p) => p.value === program) || null}
                    onChange={(o) => setProgram(o?.value || "")}
                    placeholder="Select Program"
                />
            )}

            {/* Custom Field Builder & Step Form Render */}
            {/* ... keep your current UI code for custom field toggle and step form ... */}
        </form>
    )
}
