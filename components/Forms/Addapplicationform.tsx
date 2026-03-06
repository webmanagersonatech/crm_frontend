"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Select from "react-select"
import { toast } from "react-toastify";

import { getActiveInstitutions } from "@/app/lib/request/institutionRequest"
import { getFormByInstituteId } from "@/app/lib/request/formManager"
import { createApplication, getApplicationById, updateApplication } from "@/app/lib/request/application"
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest"

import { Country, State, City } from "country-state-city"


interface OptionType {
    value: string
    label: string
}

type SelectedLead = {
    _id: string;
    instituteId?: string;
    candidateName?: string;
    program?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    country?: string;
    state?: string;
    city?: string;
    status?: string;
};



type Tab = "personal" | "education"

export default function AddApplicationForm({
    instituteId,
    LeadId,
    isEdit = false,
    applicationId,
    onSuccess,
    refetch,
    selectedLead,
    applicationSource,
}: {
    instituteId?: string
    applicationId?: string
    LeadId?: string
    isEdit?: boolean
    selectedLead?: SelectedLead;
    applicationSource?: "online" | "offline" | "lead";
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
    const [minApplicantAge, setMinApplicantAge] = useState<number | null>(null)
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [files, setFiles] = useState<Record<string, File>>({})
    const [activeTab, setActiveTab] = useState<Tab>("personal")
    const [showCustomField, setShowCustomField] = useState(false)
    const [showAcademicYear, setShowAcademicYear] = useState(false)
    const [academicYear, setAcademicYear] = useState<string>('')
    const [startYear, setStartYear] = useState<OptionType | null>(null)
    const [endYear, setEndYear] = useState<OptionType | null>(null)
    // Add this with other useState declarations
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const countryOptions = Country.getAllCountries().map(c => ({
        value: c.isoCode,
        label: c.name,
    }))


    // Add this function after your existing validation functions
    const validateField = (field: any, value: any): string => {
        if (field.required && (!value || value.toString().trim() === "")) {
            return `${field.fieldName} is required`;
        }

        if (value && value.toString().trim() !== "") {
            if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return "Invalid email format";
            }

            if (field.type === "date" && field.fieldName.toLowerCase().includes("date of birth")) {
                if (!isValidDOB(value)) {
                    return `Student must be at least ${minApplicantAge ?? 16} years old and DOB cannot be in the future`;
                }
            }
        }

        return "";
    };
    // Add this function after handleFileChange
    const handleBlur = (
        e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        // Find the field configuration
        let fieldConfig = null;
        ['personal', 'education'].forEach(tab => {
            formConfig?.[`${tab}Details`]?.forEach((section: any) => {
                const found = section.fields.find((f: any) => f.fieldName === name);
                if (found) fieldConfig = found;
            });
        });

        if (fieldConfig) {
            const error = validateField(fieldConfig, value);
            setFieldErrors(prev => ({
                ...prev,
                [name]: error
            }));
        }
    }

  
    const [showInstituteDropdown, setShowInstituteDropdown] = useState(true)
    const [newField, setNewField] = useState({
        tab: "personal" as Tab,
        sectionName: "",
        fieldName: "",
        fieldType: "",
        options: "",
        required: false,
    })

    // const BASE_URL = "http://localhost:4000/uploads/";
    const BASE_URL = "https://hikabackend.sonastar.com/uploads/";



    const inputClass =
        "border border-gray-300  w-full p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#5667a8]"



    const fromYear = 2018
    const toYear = 2060

    const startYearOptions: OptionType[] = Array.from(
        { length: toYear - fromYear + 1 },
        (_, i) => {
            const year = fromYear + i
            return { value: year.toString(), label: year.toString() }
        }
    )

    const mapLeadToFormData = (lead: any) => {
        const fullName = lead.candidateName || "";


        const firstName = fullName.split(" ")[0] || "";

        return {
            "First Name": firstName,
            "Full Name": fullName,
            "Contact Number": lead.phoneNumber || "",
            "Date of Birth": lead.dateOfBirth
                ? lead.dateOfBirth.split("T")[0]
                : "",
            "Country": lead.country || "",
            "State": lead.state || "",
            "City": lead.city || "",
            "Status": lead.status || "",
        };
    };


    const endYearOptions: OptionType[] = startYear
        ? Array.from(
            { length: 2060 - Number(startYear.value) },
            (_, i) => {
                const year = Number(startYear.value) + i + 1
                return { value: year.toString(), label: year.toString() }
            }
        )
        : []

    useEffect(() => {
        if (!selectedLead || !formConfig) return;

        // 🔹 set program separately
        if (selectedLead.program) {
            setProgram(selectedLead.program);
        }

        // 🔹 map lead fields
        const leadData = mapLeadToFormData(selectedLead);

        setFormData((prev) => ({
            ...prev,
            ...leadData,
        }));

    }, [selectedLead, formConfig]);

    useEffect(() => {
        if (selectedLead?.instituteId) {
            setSelectedInstitute(selectedLead.instituteId);
            setShowInstituteDropdown(false);
        }
    }, [selectedLead]);


    useEffect(() => {
        const count = Number(formData["Sibling Count"]) || 0
        if (!formConfig) return

        const siblingSection = formConfig.personalDetails.find(
            (s: any) => s.sectionName === "Sibling Details"
        )
        if (!siblingSection) return

        // 1️⃣ Base fields = everything EXCEPT Sibling Count and generated fields
        const baseFields = siblingSection.fields.filter(
            (f: any) =>
                !f.isCustom &&
                f.fieldName !== "Sibling Count"
        )

        // 2️⃣ Remove previously generated sibling fields
        siblingSection.fields = siblingSection.fields.filter(
            (f: any) => !f.isCustom
        )

        // 3️⃣ Generate siblings dynamically
        for (let i = 2; i <= count; i++) {
            baseFields.forEach((field: any) => {
                siblingSection.fields.push({
                    ...field,
                    fieldName: `${field.fieldName} ${i}`,
                    label: `${field.label} ${i}`,
                    isCustom: true,
                })
            })
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
                        // 👇 AFTER you get app data
                        if (app.academicYear) {
                            setAcademicYear(app.academicYear)

                            const [s, e] = app.academicYear.split('-')
                            setStartYear({ value: s, label: s })
                            setEndYear({ value: e, label: e })
                        }

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

        //  DUPLICATE CHECK (BEFORE setState)
        const alreadyExists = targetSection.fields.some(
            (f: any) =>
                f.fieldName.trim().toLowerCase() === fieldName.trim().toLowerCase()
        )

        if (alreadyExists) {
            toast.error("Field name already exists in this section")
            return
        }

        //  SAFE STATE UPDATE
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
                setMinApplicantAge(res.age ?? null)
            })
            .catch(() => {
                toast.error("Failed to load form")
                setMinApplicantAge(null)
            })
    }, [selectedInstitute])

    // Load programs
    useEffect(() => {
        if (!selectedInstitute) return

        getSettingsByInstitute(selectedInstitute)
            .then((res) => {

                setAcademicYear(res?.academicYear || '')
                if (res?.academicYear) {
                    const [s, e] = res.academicYear.split('-')
                    setStartYear({ value: s, label: s })
                    setEndYear({ value: e, label: e })
                }
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

    const hasPersonalField = (name: string) =>
        formConfig?.personalDetails?.some((section: any) =>
            section.fields.some(
                (f: any) => f.fieldName.toLowerCase() === name.toLowerCase()
            )
        )



    // Update validateSection function to clear previous errors
    const validateSection = (sections?: any[]) => {
        if (!Array.isArray(sections)) return true

        let isValid = true;
        const newErrors: Record<string, string> = {};

        for (const section of sections) {
            for (const field of section.fields || []) {
                const value = formData[field.fieldName];
                const error = validateField(field, value);

                if (error) {
                    newErrors[field.fieldName] = error;
                    isValid = false;
                }
            }
        }

        setFieldErrors(prev => ({ ...prev, ...newErrors }));
        return isValid;
    }

    // Input handlers
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type, checked } = e.target as HTMLInputElement
        const newValue = type === "checkbox" ? checked : value

        setFormData(p => ({ ...p, [name]: newValue }))

        // Clear error when user starts typing
        setFieldErrors(prev => ({
            ...prev,
            [name]: ''
        }));
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const fieldName = e.target.name;

        if (!file) return;

        const MAX_SIZE = 2 * 1024 * 1024; // 2MB

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];

        // File size validation
        if (file.size > MAX_SIZE) {
            toast.error("File size must be less than 2MB");
            e.target.value = "";
            return;
        }

        // File type validation
        if (!allowedTypes.includes(file.type)) {
            toast.error("Invalid file type. Only images and documents allowed.");
            e.target.value = "";
            return;
        }

        // Save file
        setFiles(prev => ({ ...prev, [fieldName]: file }));
        setFormData(prev => ({ ...prev, [fieldName]: file.name }));

        // Find field config for validation
        let fieldConfig: any = null;

        ["personal", "education"].forEach(tab => {
            formConfig?.[`${tab}Details`]?.forEach((section: any) => {
                const found = section.fields.find((f: any) => f.fieldName === fieldName);
                if (found) fieldConfig = found;
            });
        });

        // Run existing validation
        if (fieldConfig) {
            const error = validateField(fieldConfig, file.name);
            setFieldErrors(prev => ({
                ...prev,
                [fieldName]: error
            }));
        }
    };



    const renderField = (field: any) => {
        const value = formData[field.fieldName] ?? (field.type === "checkbox" ? [] : "");
        const error = fieldErrors[field.fieldName];
        const hasError = !!error;

        /* =========================
           COUNTRY
        ========================= */
        if (field.fieldName === "Country" || field.fieldName === "Permanent  Country") {

            const isPermanent = field.fieldName.includes("Permanent");

            const countryField = isPermanent ? "Permanent  Country" : "Country";
            const stateField = isPermanent ? "Permanent  State" : "State";
            const cityField = isPermanent ? "Permanent City" : "City";

            return (
                <div>
                    <Select
                        options={countryOptions}
                        value={countryOptions.find(o => o.label === formData[countryField]) || null}
                        onChange={(val) => {
                            setFormData(p => ({
                                ...p,
                                [countryField]: val?.label || "",
                                [stateField]: "",
                                [cityField]: "",
                            }));

                            setFieldErrors(prev => ({ ...prev, [countryField]: '' }));
                        }}
                        onBlur={() => {
                            const error = validateField(field, formData[countryField]);
                            setFieldErrors(prev => ({ ...prev, [countryField]: error }));
                        }}
                        placeholder="Select Country"
                    />

                    {hasError && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
            );
        }

        /* =========================
           STATE
        ========================= */
        if (field.fieldName === "State" || field.fieldName === "Permanent  State") {

            const isPermanent = field.fieldName.includes("Permanent");

            const countryField = isPermanent ? "Permanent  Country" : "Country";
            const stateField = isPermanent ? "Permanent  State" : "State";
            const cityField = isPermanent ? "Permanent City" : "City";

            let options: any[] = [];

            const countryCode = Country.getAllCountries()
                .find(c => c.name === formData[countryField])?.isoCode;

            options = countryCode
                ? State.getStatesOfCountry(countryCode).map(s => ({
                    value: s.isoCode,
                    label: s.name
                }))
                : [];

            return (
                <div>
                    <Select
                        options={options}
                        value={options.find(o => o.label === formData[stateField]) || null}
                        onChange={(val) => {
                            setFormData(p => ({
                                ...p,
                                [stateField]: val?.label || "",
                                [cityField]: ""
                            }));

                            setFieldErrors(prev => ({ ...prev, [stateField]: '' }));
                        }}
                        isDisabled={!formData[countryField]}
                        placeholder="Select State"
                    />

                    {hasError && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
            );
        }
        /* =========================
           CITY
        ========================= */
        if (field.fieldName === "City" || field.fieldName === "Permanent City") {

            const isPermanent = field.fieldName.includes("Permanent");

            const countryField = isPermanent ? "Permanent  Country" : "Country";
            const stateField = isPermanent ? "Permanent  State" : "State";
            const cityField = isPermanent ? "Permanent City" : "City";

            let options: any[] = [];

            const countryCode =
                Country.getAllCountries().find(c => c.name === formData[countryField])
                    ?.isoCode;

            const stateCode =
                State.getStatesOfCountry(countryCode || "")
                    .find(s => s.name === formData[stateField])?.isoCode;

            if (stateCode) {
                options = City.getCitiesOfState(countryCode!, stateCode).map(c => ({
                    value: c.name,
                    label: c.name
                }));
            }

            return (
                <div>
                    <Select
                        options={options}
                        value={options.find(o => o.label === formData[cityField]) || null}
                        onChange={(val) => {
                            setFormData(p => ({
                                ...p,
                                [cityField]: val?.label || ""
                            }));

                            setFieldErrors(prev => ({ ...prev, [cityField]: '' }));
                        }}
                        isDisabled={!formData[stateField]}
                        placeholder="Select City"
                    />

                    {hasError && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
            );
        }

        /* =========================
           TYPE BASED RENDERING
        ========================= */
        const renderInput = () => {
            switch (field.type) {
                /* TEXTAREA */
                case "textarea":
                    return (
                        <textarea
                            name={field.fieldName}
                            value={value}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`${inputClass} ${hasError ? 'border-red-500' : ''}`}
                            maxLength={field.maxLength ?? 500}
                        />
                    );

                /* SELECT */
                case "select":
                    return (
                        <select
                            name={field.fieldName}
                            value={value}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`${inputClass} ${hasError ? 'border-red-500' : ''}`}
                        >
                            <option value="">Select</option>
                            {field.options?.map((o: string) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                    );

                /* RADIO */
                case "radiobutton":
                    return (
                        <div className="space-y-1">
                            {field.options?.map((o: string) => (
                                <label key={o} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name={field.fieldName}
                                        value={o}
                                        checked={value === o}
                                        onChange={() => {
                                            setFormData(p => ({
                                                ...p,
                                                [field.fieldName]: o,
                                            }));
                                            // Clear error on change
                                            setFieldErrors(prev => ({ ...prev, [field.fieldName]: '' }));
                                        }}
                                        onBlur={() => {
                                            const error = validateField(field, value);
                                            setFieldErrors(prev => ({ ...prev, [field.fieldName]: error }));
                                        }}
                                    />
                                    {o}
                                </label>
                            ))}
                        </div>
                    );

                /* CHECKBOX */
                case "checkbox":
                    return (
                        <div className="space-y-1">
                            {field.options?.map((o: string) => (
                                <label key={o} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={(value || []).includes(o)}
                                        onChange={(e) => {
                                            const updated = e.target.checked
                                                ? [...value, o]
                                                : value.filter((v: string) => v !== o);

                                            setFormData(p => ({
                                                ...p,
                                                [field.fieldName]: updated,
                                            }));
                                            setFieldErrors(prev => ({ ...prev, [field.fieldName]: '' }));
                                        }}
                                        onBlur={() => {
                                            const error = validateField(field, value);
                                            setFieldErrors(prev => ({ ...prev, [field.fieldName]: error }));
                                        }}
                                    />
                                    {o}
                                </label>
                            ))}
                        </div>
                    );

                /* FILE */
                /* FILE */
                /* FILE */
                case "file":
                    const isImage = (filename: string) => {
                        const ext = filename?.split('.').pop()?.toLowerCase();
                        return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
                    };

                    const isPDF = (filename: string) => {
                        const ext = filename?.split('.').pop()?.toLowerCase();
                        return ext === 'pdf';
                    };

                    const isDocument = (filename: string) => {
                        const ext = filename?.split('.').pop()?.toLowerCase();
                        return ['doc', 'docx'].includes(ext || '');
                    };

                    const getFileIcon = (filename: string) => {
                        if (isPDF(filename)) return '📄';
                        if (isDocument(filename)) return '📝';
                        return '📎';
                    };

                    const currentFile = files[field.fieldName]?.name || formData[field.fieldName];

                    return (
                        <div>
                            <input
                                type="file"
                                name={field.fieldName}
                                onChange={handleFileChange}
                                onBlur={() => {
                                    const error = validateField(field, files[field.fieldName]?.name || formData[field.fieldName]);
                                    setFieldErrors(prev => ({ ...prev, [field.fieldName]: error }));
                                }}
                                className={`${inputClass} ${hasError ? 'border-red-500' : ''}`}
                                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                            />

                            {/* Preview for newly uploaded files */}
                            {files[field.fieldName] && (
                                <div className="mt-2 p-2 border rounded bg-gray-50">
                                    {isImage(files[field.fieldName].name) ? (
                                        <img
                                            src={URL.createObjectURL(files[field.fieldName])}
                                            alt="Preview"
                                            className="max-h-20 rounded border"
                                            onLoad={() => URL.revokeObjectURL(URL.createObjectURL(files[field.fieldName]))}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-2xl">{getFileIcon(files[field.fieldName].name)}</span>
                                            <span className="text-gray-600 truncate max-w-[200px]">
                                                {files[field.fieldName].name}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                ({(files[field.fieldName].size / 1024).toFixed(2)} KB)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Existing file from server */}
                            {formData[field.fieldName] && !files[field.fieldName] && (
                                <div className="mt-2 p-2 border rounded bg-gray-50">
                                    {isImage(formData[field.fieldName]) ? (
                                        <img
                                            src={`${BASE_URL}${formData[field.fieldName]}`}
                                            alt="Current file"
                                            className="max-h-20 rounded border"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{getFileIcon(formData[field.fieldName])}</span>
                                            <a
                                                href={`${BASE_URL}${formData[field.fieldName]}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 text-sm hover:underline truncate max-w-[200px]"
                                            >
                                                {formData[field.fieldName]}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );

                /* NUMBER */
                case "number":
                    return (
                        <input
                            type="text"
                            name={field.fieldName}
                            value={value}
                            className={`${inputClass} ${hasError ? 'border-red-500' : ''}`}
                            inputMode="numeric"
                            maxLength={field.maxLength ?? 15}
                            onChange={(e) => {
                                const numericValue = e.target.value.replace(/\D/g, "");
                                setFormData(p => ({ ...p, [field.fieldName]: numericValue }));
                                setFieldErrors(prev => ({ ...prev, [field.fieldName]: '' }));
                            }}
                            onBlur={handleBlur}
                        />
                    );

                /* TEXT ONLY */
                case "text":
                    return (
                        <input
                            type="text"
                            name={field.fieldName}
                            value={value}
                            className={`${inputClass} ${hasError ? 'border-red-500' : ''}`}
                            maxLength={field.maxLength ?? 100}
                            onChange={(e) => {
                                const textValue = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                                setFormData(p => ({ ...p, [field.fieldName]: textValue }));
                                setFieldErrors(prev => ({ ...prev, [field.fieldName]: '' }));
                            }}
                            onBlur={handleBlur}
                        />
                    );

                /* ALPHANUMERIC */
                case "alphanumeric":
                    return (
                        <input
                            type="text"
                            name={field.fieldName}
                            value={value}
                            className={`${inputClass} ${hasError ? 'border-red-500' : ''}`}
                            maxLength={field.maxLength ?? 100}
                            onChange={(e) => {
                                const alphanumericValue = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
                                setFormData(p => ({ ...p, [field.fieldName]: alphanumericValue }));
                                setFieldErrors(prev => ({ ...prev, [field.fieldName]: '' }));
                            }}
                            onBlur={handleBlur}
                        />
                    );

                /* ANY */
                case "any":
                    return (
                        <input
                            type="text"
                            name={field.fieldName}
                            value={value}
                            className={`${inputClass} ${hasError ? 'border-red-500' : ''}`}
                            maxLength={field.maxLength ?? 300}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    );

                default:
                    return (
                        <input
                            type={field.type}
                            name={field.fieldName}
                            value={value}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`${inputClass} ${hasError ? 'border-red-500' : ''}`}
                            maxLength={field.maxLength || undefined}
                        />
                    );
            }
        };

        return (
            <div>
                {renderInput()}
                {hasError && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>
        );
    };


    // Navigation handlers
    // Update handleNext function
    const handleNext = () => {
        if (!validateSection(formConfig?.personalDetails)) return
        setFieldErrors({}); // Clear errors when moving to next tab
        setActiveTab("education")
    }

    // Update handlePrev function
    const handlePrev = () => {
        if (activeTab === "education") {
            setFieldErrors({}); // Clear errors when moving back
            setActiveTab("personal");
        }
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

    const isValidDOB = (dob: string) => {
        if (!dob) return false

        const birthDate = new Date(dob)
        const today = new Date()

        //  future date check
        if (birthDate > today) return false

        const minAge = minApplicantAge ?? 16

        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()

        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }

        return age >= minAge
    }

    useEffect(() => {
        if (startYear && endYear) {
            setAcademicYear(`${startYear.value}-${endYear.value}`)
        }
    }, [startYear, endYear])


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
            fd.append("academicYear", academicYear)

            if (applicationSource) {
                fd.append("applicationSource", applicationSource);
            }
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
            <div className="flex items-center justify-between mb-3 p-3 border rounded bg-white">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                        Manual Academic Year
                    </h3>
                    <p className="text-xs text-gray-500">
                        Enable to manually select academic year
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowAcademicYear(!showAcademicYear)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition
      ${showAcademicYear ? "bg-blue-600" : "bg-gray-300"}`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition
        ${showAcademicYear ? "translate-x-6" : "translate-x-1"}`}
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
                            <option value="number">Number</option>
                            <option value="alphanumeric">Text + Number</option>
                            <option value="any">Any (Allow All)</option> {/* NEW */}
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
            {showAcademicYear && (
                <div className="mb-4 p-3 border rounded bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Academic Year
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                            options={startYearOptions}
                            value={startYear}
                            onChange={(val) => {
                                setStartYear(val)
                                setEndYear(null)
                            }}
                            placeholder="Start Year"
                        />

                        <Select
                            options={endYearOptions}
                            value={endYear}
                            onChange={(val) => setEndYear(val)}
                            placeholder="End Year"
                            isDisabled={!startYear}
                        />
                    </div>
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
                                    {/*  REMOVE BUTTON (only for manually added fields) */}
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
