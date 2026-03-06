"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Select, { SingleValue } from "react-select";
import { toast } from "react-toastify";
import { Edit3 } from "lucide-react";
import { getLeadById, updateLead, Lead } from "@/app/lib/request/leadRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest";
import { Country, State, City } from "country-state-city";

interface OptionType {
  value: string;
  label: string;
}

export default function EditLeadPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [programOptions, setProgramOptions] = useState<OptionType[]>([]);
  const [countryOptions, setCountryOptions] = useState<OptionType[]>([]);
  const [stateOptions, setStateOptions] = useState<OptionType[]>([]);
  const [cityOptions, setCityOptions] = useState<OptionType[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Partial<Lead>>({
    instituteId: "",
    program: "",
    candidateName: "",
    ugDegree: "",
    phoneNumber: "",
    dateOfBirth: "",
    country: "",
    state: "",
    city: "",
    status: "New",
    communication: "",
    followUpDate: "",
    description: "",
    counsellorName: "",
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
  const isAtLeast18YearsOld = (dob: string) => {
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

    return age >= 18;
  };
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.program) newErrors.program = "Program is required";
    if (!form.candidateName?.trim())
      newErrors.candidateName = "Candidate name is required";
    if (!form.counsellorName?.trim())
      newErrors.counsellorName = "Counsellor name is required";
    if (!form.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(form.phoneNumber)) {
      newErrors.phoneNumber = "Enter valid 10 digit phone number";
    }
    if (!form.dateOfBirth)
      newErrors.dateOfBirth = "Date of birth is required";
    if (!form.country)
      newErrors.country = "Country is required";
    if (!form.state)
      newErrors.state = "State is required";
    if (!form.city)
      newErrors.city = "City is required";
    if (!form.communication)
      newErrors.communication = "Communication is required";

    // Followup date required only when status = Followup
    if (form.status === "Followup" && !form.followUpDate) {
      newErrors.followUpDate = "Follow up date is required";
    }

    if (form.dateOfBirth && !isAtLeast18YearsOld(form.dateOfBirth)) {
      newErrors.dateOfBirth = "Must be 18+ years old";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  //  Load institutions & countries
  useEffect(() => {
    const loadData = async () => {
      try {
        const activeInstitutions = await getActiveInstitutions();
        setInstitutions(
          activeInstitutions.map((inst: any) => ({
            value: inst.instituteId,
            label: inst.name,
          }))
        );
        const countries = Country.getAllCountries();
        setCountryOptions(countries.map(c => ({ value: c.isoCode, label: c.name })));
      } catch {
        toast.error("Failed to load institutions or countries.");
      }
    };
    loadData();
  }, []);

  //  Load existing lead details
  useEffect(() => {
    if (!id) return;
    const loadLead = async () => {
      try {
        const data = await getLeadById(id as string);

        const normalizeDate = (date: any) =>
          date ? new Date(date).toISOString().split("T")[0] : "";

        setForm({
          ...data,
          dateOfBirth: normalizeDate(data.dateOfBirth),
          followUpDate: normalizeDate(data.followUpDate),
        });

        setSelectedInstitute(data.instituteId);

        // preload state and city
        if (data.country) {
          const country = Country.getAllCountries().find(c => c.name === data.country);
          if (country) {
            const states = State.getStatesOfCountry(country.isoCode);
            setStateOptions(states.map(s => ({ value: s.isoCode, label: s.name })));
            if (data.state) {
              const state = states.find(s => s.name === data.state);
              if (state) {
                const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
                setCityOptions(cities.map(c => ({ value: c.name, label: c.name })));
              }
            }
          }
        }
      } catch (error: any) {
        console.error(error);
        toast.error("Failed to load lead.");
      }
    };
    loadLead();
  }, [id]);

  //  Sync institute selection after institutions load
  useEffect(() => {
    if (institutions.length && form.instituteId) {
      setSelectedInstitute(form.instituteId);
    }
  }, [institutions, form.instituteId]);

  //  Load programs when institute changes
  useEffect(() => {
    if (!selectedInstitute) {
      setProgramOptions([]);
      setForm(prev => ({ ...prev, program: "" }));
      return;
    }
    const loadPrograms = async () => {
      try {
        const settings = await getSettingsByInstitute(selectedInstitute);
        if (settings.courses?.length) {
          setProgramOptions(settings.courses.map((c: string) => ({ value: c, label: c })));
        } else {
          setProgramOptions([]);
        }
      } catch {
        setProgramOptions([]);
        toast.error("Failed to load programs.");
      }
    };
    loadPrograms();
  }, [selectedInstitute]);

  //  Input handlers
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "candidateName" || name === "counsellorName") {
      newValue = value.replace(/[^a-zA-Z\s]/g, "");
    }

    if (name === "phoneNumber") {
      newValue = value.replace(/[^0-9]/g, "").slice(0, 10);
    }

    setForm(prev => ({ ...prev, [name]: newValue }));

    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name: keyof Lead, selected: SingleValue<OptionType>) => {
    let newValue = selected?.value || "";
    if (name === "country" || name === "state") newValue = selected?.label || "";

    setForm(prev => ({ ...prev, [name]: newValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (name === "instituteId") setSelectedInstitute(selected?.value || "");

    if (name === "country" && selected?.value) {
      const states = State.getStatesOfCountry(selected.value);
      setStateOptions(states.map(s => ({ value: s.isoCode, label: s.name })));
      setCityOptions([]);
      setForm(prev => ({ ...prev, state: "", city: "" }));
    }

    if (name === "state" && selected?.value && form.country) {
      const countryIso = Country.getAllCountries().find(c => c.name === form.country)?.isoCode;
      if (countryIso) {
        const cities = City.getCitiesOfState(countryIso, selected.value);
        setCityOptions(cities.map(c => ({ value: c.name, label: c.name })));
        setForm(prev => ({ ...prev, city: "" }));
      }
    }
  };

  //  Save updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill all required fields correctly.");
      return;
    }

    setLoading(true);

    try {
      await updateLead(id as string, form);
      toast.success("Lead updated successfully!");
      router.push("/leads");
    } catch (err: any) {
      toast.error(err.message || "Failed to update lead.");
    } finally {
      setLoading(false);
    }
  };

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

  if (loading)
    return <p className="p-6 text-gray-600">Loading lead details...</p>;

  return (
    <div className="p-6">

      <div className="flex items-center gap-2 mb-6">
        <Edit3 className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Edit Lead
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >
        {/* Program */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Program <span className="text-red-500">* </span></label>
          <Select
            options={programOptions}
            value={programOptions.find(opt => opt.value === form.program) || null}
            onChange={selected => handleSelectChange("program", selected)}
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
            value={form.candidateName || ""}
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
            onChange={handleChange}
            placeholder="Enter counsellor name (or leave blank to use your name)"
            className={`${inputClass} ${errors.counsellorName ? "border-red-500 focus:ring-red-500" : ""}`}

          />
          {errors.counsellorName && (
            <span className="text-red-500 text-xs mt-1">
              {errors.counsellorName}
            </span>
          )}
        </div>


        {/* UG Degree */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">UG Degree</label>
          <input
            type="text"
            name="ugDegree"
            value={form.ugDegree || ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Phone Number <span className="text-red-500">* </span></label>
          <input
            type="text"
            name="phoneNumber"
            value={form.phoneNumber || ""}
            onChange={handleChange}
            className={`${inputClass} ${errors.phoneNumber ? "border-red-500 focus:ring-red-500" : ""}`}
          />
          {errors.phoneNumber && (
            <span className="text-red-500 text-xs mt-1">
              {errors.phoneNumber}
            </span>
          )}
        </div>

        {/* DOB */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Date of Birth <span className="text-red-500">* </span></label>
          <input
            type="date"
            name="dateOfBirth"
            value={form.dateOfBirth || ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Country */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Country <span className="text-red-500">* </span></label>
          <Select
            options={countryOptions}
            value={countryOptions.find(opt => opt.label === form.country) || null}
            onChange={selected => handleSelectChange("country", selected)}
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
            value={stateOptions.find(opt => opt.label === form.state) || null}
            onChange={selected => handleSelectChange("state", selected)}
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
          <label className="text-sm font-semibold mb-1">City <span className="text-red-500">* </span></label>
          <Select
            options={cityOptions}
            value={cityOptions.find(opt => opt.label === form.city) || null}
            onChange={selected => handleSelectChange("city", selected)}
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
          <label className="text-sm font-semibold mb-1">Status <span className="text-red-500">* </span></label>
          <Select
            options={statusOptions}
            value={statusOptions.find(opt => opt.value === form.status)}
            onChange={selected => handleSelectChange("status", selected)}
            styles={customSelectStyles("status")}
          />
        </div>

        {/* Communication */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Communication <span className="text-red-500">* </span></label>
          <Select
            options={communicationOptions}
            value={communicationOptions.find(opt => opt.value === form.communication)}
            onChange={selected => handleSelectChange("communication", selected)}
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
          <label className="text-sm font-semibold mb-1">Follow Up Date </label>

          <input
            type="date"
            name="followUpDate"
            value={form.followUpDate || ""}
            min={new Date().toISOString().split("T")[0]} // allow today & future
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
        <div className="flex flex-col md:col-span-3">
          <label className="text-sm font-semibold mb-1">Description</label>
          <textarea
            name="description"
            value={form.description || ""}
            onChange={handleChange}
            className={inputClass}
            rows={4}
          />
        </div>

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
            {loading ? "Saving..." : "Update Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
