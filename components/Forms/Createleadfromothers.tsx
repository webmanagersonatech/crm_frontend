"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select, { SingleValue } from "react-select";
import { toast } from "react-toastify";;
import { UserPlus2 } from "lucide-react";
import { Lead } from "@/app/lib/request/leadRequest";
import { createLeadFromOther } from "@/app/lib/request/othersRequest";
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest";
import { Country, State, City } from "country-state-city";

interface OptionType {
    value: string;
    label: string;
}
interface CreateLeadFormProps {
    refetch?: () => void;
    instituteId?: string;
    leadSource?: string;
    selectedotherdata?: any;
    onSuccess?: () => void;
}
export default function CreateLeadFormothers({
    refetch,
    instituteId,
    leadSource,
    selectedotherdata,
    onSuccess,
}: CreateLeadFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [programOptions, setProgramOptions] = useState<OptionType[]>([]);
    const [countryOptions, setCountryOptions] = useState<OptionType[]>([]);
    const [stateOptions, setStateOptions] = useState<OptionType[]>([]);
    const [cityOptions, setCityOptions] = useState<OptionType[]>([]);
    const [showInstituteDropdown, setShowInstituteDropdown] = useState(false);
    const [selectedInstitute, setSelectedInstitute] = useState<string>("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [applicantAge, setApplicantAge] = useState<number>(18);
    const [userDepartments, setUserDepartments] = useState<string[]>([]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!form.instituteId) newErrors.instituteId = "Institute is required";
        if (!form.programId) newErrors.program = "Program is required";
        if (!form.candidateName?.trim()) newErrors.candidateName = "Candidate name is required";
        if (!form.counsellorName?.trim()) newErrors.counsellorName = "Counsellor name is required";

        if (!form.phoneNumber) {
            newErrors.phoneNumber = "Phone number is required";
        } else if (!/^[0-9]{10}$/.test(form.phoneNumber)) {
            newErrors.phoneNumber = "Enter valid 10 digit phone number";
        }

        // Email validation
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = "Enter a valid email address";
        }

        if (form.dateOfBirth) {
            if (!isValidAge(form.dateOfBirth, applicantAge)) {
                newErrors.dateOfBirth = `Must be at least ${applicantAge} years old`;
            }
        }

        if (!form.country) newErrors.country = "Country is required";
        if (!form.state) newErrors.state = "State is required";
        if (!form.city) newErrors.city = "City is required";
        if (!form.communication) newErrors.communication = "Communication is required";
        if (form.status === "Followup" && !form.followUpDate) {
            newErrors.followUpDate = "Follow up date is required";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const [form, setForm] = useState<Partial<Lead>>({
        instituteId: "",
        programId: "",
        counsellorName: "",
        candidateName: "",
        ugDegree: "",
        phoneNumber: "",
        email: "",
        dateOfBirth: "",
        country: "",
        state: "",
        city: "",
        status: "New",
        communication: "",
        followUpDate: "",
        description: "",
    });

    const statusOptions: OptionType[] = [
        { value: "New", label: "New" },
        { value: "Followup", label: "Followup" },
        { value: "Not Reachable", label: "Not Reachable" },
        { value: "Switched Off", label: "Switched Off" },
        { value: "Not Picked", label: "Not Picked" },
        { value: "Irrelevant", label: "Irrelevant" },
        { value: "Interested", label: "Interested" },
        { value: "Not Interested", label: "Not Interested" },
        { value: "Cut the call", label: "Cut the call" },
        { value: "Admitted", label: "Admitted" },
        { value: "Closed", label: "Closed" },
    ];

    const communicationOptions: OptionType[] = [
        { value: "WhatsApp", label: "WhatsApp" },
        { value: "Offline", label: "Offline" },
        { value: "Online", label: "Online" },
        { value: "Phone", label: "Phone" },
        { value: "Social Media", label: "Social Media" },
    ];

    useEffect(() => {
        if (!selectedotherdata) return;

        const extraFields = selectedotherdata.extraFields || {};

        // Helper to extract values (case-insensitive)
        const extractValue = (obj: any, keys: string[]): string => {
            if (!obj || typeof obj !== 'object') return '';

            for (const key of keys) {
                const lowerKey = key.toLowerCase();
                for (const [objKey, val] of Object.entries(obj)) {
                    if (objKey.toLowerCase() === lowerKey && val && typeof val === 'string') {
                        return val.trim();
                    }
                }
            }
            return '';
        };

        // Extract all form data
        const candidateName = selectedotherdata.name || extractValue(extraFields, ['NAME', 'STUDENT_NAME']);
        const phoneNumber = selectedotherdata.phone || extractValue(extraFields, ['PHONE', 'MOBILE', 'CONTACT_NUMBER']);
        const email = (selectedotherdata.email || extractValue(extraFields, ['EMAIL', 'EMAILID', 'MAIL_ID', 'EMAIL_ID'])).toLowerCase();
        const ugDegree = extractValue(extraFields, ['DEGREE', 'UG_DEGREE', 'QUALIFICATION']);
        const rawCity = extractValue(extraFields, ['CITY', 'LOCATION']) || extractValue(extraFields, ['DISTRICT']);
        const rawState = extractValue(extraFields, ['STATE', 'REGION']);
        const status = selectedotherdata.status || extractValue(extraFields, ['STATUS']) || "New";

        // Format DOB from DD-MM-YYYY to YYYY-MM-DD
        let rawDob = extractValue(extraFields, ['DOB', 'DATE_OF_BIRTH']);
        let formattedDOB = '';
        if (rawDob) {
            const match = rawDob.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
            if (match) formattedDOB = `${match[3]}-${match[2]}-${match[1]}`;
        }

        // ============================================
        // CRITICAL: CITY TO STATE MAPPING DATABASE
        // ============================================
        // This maps Indian cities to their respective states
        // You need to expand this based on your requirements
        const cityToStateMap: Record<string, string> = {
            // Telangana cities
            "HYDERABAD": "Telangana",
            "HYDERABAD (URBAN)": "Telangana",
            "SECUNDERABAD": "Telangana",
            "WARANGAL": "Telangana",
            "WARANGAL (URBAN)": "Telangana",
            "HANAMKONDA": "Telangana",
            "KARIMNAGAR": "Telangana",
            "NIZAMABAD": "Telangana",
            "KHAMMAM": "Telangana",
            "RAMAGUNDAM": "Telangana",
            "MAHABUBNAGAR": "Telangana",
            "NALGONDA": "Telangana",
            "SURYAPET": "Telangana",
            "SIDDIPET": "Telangana",

            // Andhra Pradesh cities
            "VISAKHAPATNAM": "Andhra Pradesh",
            "VIJAYAWADA": "Andhra Pradesh",
            "GUNTUR": "Andhra Pradesh",
            "NELLORE": "Andhra Pradesh",
            "KURNOOL": "Andhra Pradesh",
            "RAJAHMUNDRY": "Andhra Pradesh",
            "TIRUPATI": "Andhra Pradesh",
            "KAKINADA": "Andhra Pradesh",

            // Karnataka cities
            "BENGALURU": "Karnataka",
            "BANGALORE": "Karnataka",
            "MYSURU": "Karnataka",
            "MYSORE": "Karnataka",
            "HUBLI": "Karnataka",
            "MANGALURU": "Karnataka",
            "BELAGAVI": "Karnataka",

            // Maharashtra cities
            "MUMBAI": "Maharashtra",
            "PUNE": "Maharashtra",
            "NAGPUR": "Maharashtra",
            "NASHIK": "Maharashtra",
            "AURANGABAD": "Maharashtra",
            "SOLAPUR": "Maharashtra",

            // Tamil Nadu cities
            "CHENNAI": "Tamil Nadu",
            "COIMBATORE": "Tamil Nadu",
            "MADURAI": "Tamil Nadu",
            "TIRUCHIRAPPALLI": "Tamil Nadu",
            "SALEM": "Tamil Nadu",

            // Delhi NCR
            "DELHI": "Delhi",
            "NEW DELHI": "Delhi",
            "NOIDA": "Uttar Pradesh",
            "GURUGRAM": "Haryana",
            "FARIDABAD": "Haryana",
            "GHAZIABAD": "Uttar Pradesh",

            // Uttar Pradesh
            "LUCKNOW": "Uttar Pradesh",
            "KANPUR": "Uttar Pradesh",
            "AGRA": "Uttar Pradesh",
            "VARANASI": "Uttar Pradesh",
            "ALLAHABAD": "Uttar Pradesh",
            "PRAYAGRAJ": "Uttar Pradesh",

            // West Bengal
            "KOLKATA": "West Bengal",
            "HOWRAH": "West Bengal",
            "DARJEELING": "West Bengal",
            "SILIGURI": "West Bengal",

            // Gujarat
            "AHMEDABAD": "Gujarat",
            "SURAT": "Gujarat",
            "VADODARA": "Gujarat",
            "RAJKOT": "Gujarat",
            "BHAVNAGAR": "Gujarat",

            // Rajasthan
            "JAIPUR": "Rajasthan",
            "JODHPUR": "Rajasthan",
            "UDAIPUR": "Rajasthan",
            "KOTA": "Rajasthan",

            // Madhya Pradesh
            "INDORE": "Madhya Pradesh",
            "BHOPAL": "Madhya Pradesh",
            "JABALPUR": "Madhya Pradesh",
            "GWALIOR": "Madhya Pradesh",

            // Punjab
            "LUDHIANA": "Punjab",
            "AMRITSAR": "Punjab",
            "JALANDHAR": "Punjab",
            "PATIALA": "Punjab",

            // Haryana
            "CHANDIGARH": "Chandigarh",
            "PANCHKULA": "Haryana",
            "AMBALA": "Haryana",

            // Bihar
            "PATNA": "Bihar",
            "GAYA": "Bihar",
            "BHAGALPUR": "Bihar",

            // Kerala
            "THIRUVANANTHAPURAM": "Kerala",
            "KOCHI": "Kerala",
            "KOZHIKODE": "Kerala",
            "THRISSUR": "Kerala",
        };

        // Determine state based on:
        // 1. If state is provided in data, use that (preferred)
        // 2. Otherwise, look up city in mapping
        // 3. Fallback to empty string
        let determinedState = rawState;
        let determinedCity = rawCity;

        if (!determinedState && rawCity) {
            // Convert city to uppercase for case-insensitive lookup
            const cityUpper = rawCity.toUpperCase();

            // Try direct match
            if (cityToStateMap[cityUpper]) {
                determinedState = cityToStateMap[cityUpper];
                console.log(`✅ Mapped city "${rawCity}" to state "${determinedState}"`);
            } else {
                // Try partial match (e.g., "WARANGAL (URBAN)" -> "WARANGAL")
                for (const [mapCity, mapState] of Object.entries(cityToStateMap)) {
                    if (cityUpper.includes(mapCity) || mapCity.includes(cityUpper)) {
                        determinedState = mapState;
                        console.log(`✅ Partial match: "${rawCity}" -> "${mapCity}" -> "${mapState}"`);
                        break;
                    }
                }
            }
        }

        // Update form with found values
        setForm(prev => ({
            ...prev,
            instituteId: selectedotherdata.instituteId || prev.instituteId,
            programId: selectedotherdata.programId || "",
            candidateName,
            email,
            ugDegree,
            phoneNumber,
            dateOfBirth: formattedDOB,
            country: "India", // Default to India
            state: determinedState,
            city: determinedCity,
            status,
            communication: "",
            followUpDate: "",
            description: "",
        }));

        // Load location data (countries, states, cities)
        const loadLocationData = async () => {
            const allCountries = Country.getAllCountries();
            setCountryOptions(allCountries.map(c => ({ value: c.isoCode, label: c.name })));

            // Find India
            const india = allCountries.find(c => c.name === "India" || c.isoCode === "IN");
            if (!india) return;

            const countryIso = india.isoCode;
            const allStates = State.getStatesOfCountry(countryIso);
            setStateOptions(allStates.map(s => ({ value: s.isoCode, label: s.name })));

            // Match state (case-insensitive)
            const matchedState = allStates.find(s => s.name.toLowerCase() === determinedState?.toLowerCase());

            if (matchedState && determinedCity) {
                // Load cities for the matched state
                const cities = City.getCitiesOfState(countryIso, matchedState.isoCode);
                setCityOptions(cities.map(c => ({ value: c.name, label: c.name })));

                // Try to match city (case-insensitive)
                const matchedCity = cities.find(c => c.name.toLowerCase() === determinedCity.toLowerCase());

                if (matchedCity) {
                    setForm(prev => ({
                        ...prev,
                        state: matchedState.name,
                        city: matchedCity.name,
                        country: india.name
                    }));
                    console.log(`✅ City matched: "${matchedCity.name}" in ${matchedState.name}`);
                } else {
                    // City not found in package - keep the original city name from data
                    console.log(`⚠️ City "${determinedCity}" not found in package for state ${matchedState.name}`);
                    setForm(prev => ({
                        ...prev,
                        state: matchedState.name,
                        city: determinedCity, // Keep original city name
                        country: india.name
                    }));
                }
            } else if (matchedState) {
                setForm(prev => ({
                    ...prev,
                    state: matchedState.name,
                    country: india.name
                }));
            } else if (determinedState) {
                console.log(`State "${determinedState}" not found in India states list`);
                setForm(prev => ({ ...prev, country: india.name }));
            }
        };

        loadLocationData();

        // Set institute for program dropdown
        if (selectedotherdata.instituteId) {
            setSelectedInstitute(selectedotherdata.instituteId);
        }
    }, [selectedotherdata]);

    useEffect(() => {
        if (instituteId) {
            // If instituteId is already provided, skip showing the dropdown entirely
            setShowInstituteDropdown(false);
            setSelectedInstitute(instituteId);
            setForm((prev) => ({ ...prev, instituteId }));
            setInitLoading(false);
            return;
        }
        const token = localStorage.getItem("token");
        if (!token) {
            toast.error("Not authorized: please log in.");
            setInitLoading(false);
            return;
        }

        try {
            const payload = token.split(".")[1];
            const decoded: any = JSON.parse(atob(payload));

            const effectiveInstituteId = decoded.instituteId;
            const role = decoded.role;

            setUserDepartments(decoded.departments || []);

            if (role === "superadmin") {

                setShowInstituteDropdown(true);
            } else {
                if (effectiveInstituteId) {
                    setSelectedInstitute(effectiveInstituteId);
                    setForm((prev) => ({
                        ...prev,
                        instituteId: effectiveInstituteId,
                    }));
                }
                setShowInstituteDropdown(false);
            }
        } catch (error) {
            console.error("Failed to decode token:", error);
            setShowInstituteDropdown(false);
        } finally {
            setInitLoading(false);
        }
    }, []);

    const isValidAge = (dob: string, minAge: number) => {
        const birthDate = new Date(dob);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
            age--;
        }

        return age >= minAge;
    };

    // --- Load Programs when institute changes ---
    useEffect(() => {
        if (!selectedInstitute) {
            setProgramOptions([]);
            setForm((prev) => ({ ...prev, programId: "" }));
            return;
        }

        const loadPrograms = async () => {
            try {
                const settings = await getSettingsByInstitute(selectedInstitute);

                if (settings.applicantAge) {
                    setApplicantAge(settings.applicantAge);
                }

                if (settings.courses && settings.courses.length) {

                    let filteredCourses = settings.courses;

                    // ✅ Apply department filter ONLY if departments exist
                    if (userDepartments && userDepartments.length > 0) {
                        filteredCourses = settings.courses.filter((course: any) =>
                            userDepartments.includes(course.courseId)
                        );
                    }

                    setProgramOptions(
                        filteredCourses.map((course: any) => ({
                            value: course.courseId,
                            label: course.name,
                        }))
                    );

                    // ✅ Reset program if it's not in allowed list
                    setForm((prev) => {
                        const isValid = filteredCourses.some(
                            (c: any) => c.courseId === prev.programId
                        );

                        return {
                            ...prev,
                            programId: isValid ? prev.programId : "",
                        };
                    });

                    // ⚠️ Optional: Show message if nothing allowed
                    if (userDepartments.length > 0 && filteredCourses.length === 0) {
                        toast.error("No programs assigned to your department");
                    }

                } else {
                    setProgramOptions([]);
                    setForm((prev) => ({ ...prev, programId: "" }));
                    toast.error("No courses found in institute settings.");
                }
            } catch (error: any) {
                console.error(error);
                setProgramOptions([]);
                setForm((prev) => ({ ...prev, programId: "" }));
                toast.error("No courses found in institute settings.");
            }
        };

        loadPrograms();
    }, [selectedInstitute]);

    // --- Input Change Handler ---
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        let newValue = value;

        // Allow only letters and space for name fields
        if (name === "candidateName" || name === "counsellorName") {
            newValue = value.replace(/[^a-zA-Z\s]/g, "");
        }

        // Allow only numbers for phone
        if (name === "phoneNumber") {
            newValue = value.replace(/[^0-9]/g, "").slice(0, 10);
        }

        // Convert email to lowercase
        if (name === "email") {
            newValue = value.toLowerCase();
        }

        setForm((prev) => ({ ...prev, [name]: newValue }));

        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
    };

    // --- Dropdown Change Handler (Fixed for country/state names) ---
    const handleSelectChange = (name: keyof Lead, selected: SingleValue<OptionType>) => {
        let newValue = selected?.value || "";

        // Store full names for country & state
        if (name === "country" || name === "state") {
            newValue = selected?.label || "";
        }

        setForm((prev) => ({ ...prev, [name]: newValue }));
        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
        if (name === "instituteId") {
            setSelectedInstitute(selected?.value || "");
        }

        // Cascade: Country → State → City
        if (name === "country" && selected?.value) {
            const states = State.getStatesOfCountry(selected.value);
            setStateOptions(states.map((s) => ({ value: s.isoCode, label: s.name })));
            setCityOptions([]);
            setForm((prev) => ({ ...prev, state: "", city: "" }));
        }

        if (name === "state" && selected?.value && form.country) {
            const countryIso = Country.getAllCountries().find(
                (c) => c.name === form.country
            )?.isoCode;
            if (countryIso) {
                const cities = City.getCitiesOfState(countryIso, selected.value);
                setCityOptions(cities.map((c) => ({ value: c.name, label: c.name })));
                setForm((prev) => ({ ...prev, city: "" }));
            }
        }
    };

    // --- Submit Handler ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isValid = validateForm();
        if (!isValid) {
            toast.error("Please fill all required fields correctly.");
            return;
        }

        if (!selectedotherdata?.recordId) {
            toast.error("Record ID missing!");
            return;
        }

        setLoading(true);

        try {
            await createLeadFromOther({
                ...form,
                recordId: selectedotherdata.recordId, // ✅ correct key + value
            });

            toast.success("Lead created successfully!");

            refetch?.();
            onSuccess?.();

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create lead.");
        } finally {
            setLoading(false);
        }
    };

    // --- Styling ---
    const inputClass =
        "border border-gray-300 dark:border-neutral-700 p-2 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

    const customSelectStyles = (fieldName: string) => ({
        control: (provided: any) => ({
            ...provided,
            borderColor: errors[fieldName] ? "red" : "#d1d5db",
            borderRadius: "0.375rem",
            minHeight: "38px",
            backgroundColor: "white",
            "&:hover": {
                borderColor: errors[fieldName] ? "red" : "#3b82f6",
            },
        }),
        menu: (provided: any) => ({ ...provided, zIndex: 9999 }),
    });

    if (initLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500 text-lg">Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-6">

            <div className="flex items-center gap-2 mb-6">
                <UserPlus2 className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Generate Lead
                </h1>
            </div>

            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
            >

                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Program <span className="text-red-500">* </span></label>
                    <Select
                        options={programOptions}
                        value={programOptions.find((opt) => opt.value === form.programId) || null}
                        onChange={(selected) => handleSelectChange("programId", selected)}
                        styles={customSelectStyles("program")}
                        isClearable
                        placeholder="Select Program"
                    />
                    {errors.program && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.program}
                        </span>
                    )}
                </div>

                {/* Candidate Name */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Candidate Name <span className="text-red-500">* </span></label>
                    <input
                        type="text"
                        name="candidateName"
                        value={form.candidateName}
                        onChange={handleChange}
                        className={`${inputClass} ${errors.candidateName ? "border-red-500 focus:ring-red-500" : ""}`}
                    />
                    {errors.candidateName && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.candidateName}
                        </span>
                    )}
                </div>

                {/* Counsellor Name */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Counsellor Name <span className="text-red-500">* </span></label>
                    <input
                        type="text"
                        name="counsellorName"
                        value={form.counsellorName || ""}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, counsellorName: e.target.value }))
                        }
                        className={`${inputClass} ${errors.counsellorName ? "border-red-500 focus:ring-red-500" : ""}`}
                        placeholder="Enter counsellor name"
                    />
                    {errors.counsellorName && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.counsellorName}
                        </span>
                    )}
                </div>

                {/* Email Field - Always lowercase */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        value={form.email || ""}
                        onChange={handleChange}
                        className={`${inputClass} ${errors.email ? "border-red-500 focus:ring-red-500" : ""}`}
                        placeholder="Enter email address"
                        style={{ textTransform: 'lowercase' }}
                    />
                    {errors.email && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.email}
                        </span>
                    )}
                </div>

                {/* UG Degree */}
                {form.instituteId !== "INS-3-ZXYXKM" && (
                    <div className="flex flex-col">
                        <label className="text-sm font-semibold mb-1">UG Degree</label>
                        <input
                            type="text"
                            name="ugDegree"
                            value={form.ugDegree}
                            onChange={handleChange}
                            className={inputClass}
                        />
                    </div>)}

                {/* Phone Number */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Phone Number <span className="text-red-500">* </span></label>
                    <input
                        type="text"
                        name="phoneNumber"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        className={`${inputClass} ${errors.phoneNumber ? "border-red-500 focus:ring-red-500" : ""}`}
                    />
                    {errors.phoneNumber && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.phoneNumber}
                        </span>
                    )}
                </div>

                {/* Date of Birth */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Date of Birth </label>
                    <input
                        type="date"
                        name="dateOfBirth"
                        value={form.dateOfBirth?.toString() || ""}
                        onChange={handleChange}
                        className={`${inputClass} ${errors.dateOfBirth ? "border-red-500 focus:ring-red-500" : ""}`}
                    />
                    {errors.dateOfBirth && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.dateOfBirth}
                        </span>
                    )}
                </div>

                {/* Country */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Country <span className="text-red-500">* </span></label>
                    <Select
                        options={countryOptions}
                        value={countryOptions.find((opt) => opt.label === form.country) || null}
                        onChange={(selected) => handleSelectChange("country", selected)}
                        styles={customSelectStyles("country")}
                        isClearable
                    />
                    {errors.country && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.country}
                        </span>
                    )}
                </div>

                {/* State */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">State <span className="text-red-500">* </span></label>
                    <Select
                        options={stateOptions}
                        value={stateOptions.find((opt) => opt.label === form.state) || null}
                        onChange={(selected) => handleSelectChange("state", selected)}
                        styles={customSelectStyles("state")}
                        isClearable
                    />
                    {errors.state && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.state}
                        </span>
                    )}
                </div>

                {/* City */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">City / Location <span className="text-red-500">* </span></label>
                    <Select
                        options={cityOptions}
                        value={cityOptions.find((opt) => opt.label === form.city) || null}
                        onChange={(selected) => handleSelectChange("city", selected)}
                        styles={customSelectStyles("city")}
                        isClearable
                    />
                    {errors.city && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.city}
                        </span>
                    )}
                </div>

                {/* Status */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Status </label>
                    <Select
                        options={statusOptions}
                        value={statusOptions.find((opt) => opt.value === form.status)}
                        onChange={(selected) => handleSelectChange("status", selected)}
                        styles={customSelectStyles("status")}
                    />
                </div>

                {/* Communication */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">Communication <span className="text-red-500">* </span></label>
                    <Select
                        options={communicationOptions}
                        value={communicationOptions.find(
                            (opt) => opt.value === form.communication
                        )}
                        onChange={(selected) => handleSelectChange("communication", selected)}
                        styles={customSelectStyles("communication")}
                    />
                    {errors.communication && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.communication}
                        </span>
                    )}
                </div>

                {/* Follow Up Date */}
                <div className="flex flex-col">
                    <label className="text-sm font-semibold mb-1">
                        Follow Up Date
                    </label>
                    <input
                        type="date"
                        name="followUpDate"
                        value={form.followUpDate || ""}
                        min={new Date().toISOString().split("T")[0]} // today + future allowed
                        onChange={handleChange}
                        className={`${inputClass} ${errors.followUpDate ? "border-red-500 focus:ring-red-500" : ""}`}
                    />
                    {errors.followUpDate && (
                        <span className="text-red-500 text-xs mt-1">
                            {errors.followUpDate}
                        </span>
                    )}
                </div>

                {/* Description */}
                {/* <div className="flex flex-col md:col-span-3">
                    <label className="text-sm font-semibold mb-1">Description</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className={inputClass}
                        rows={4}
                    />
                </div> */}

                {/* Buttons */}
                <div className="md:col-span-3 flex flex-col sm:flex-row justify-end gap-2 mt-4">
                    <button
                        type="button"
                        onClick={() => router.push("/leads")}
                        className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}