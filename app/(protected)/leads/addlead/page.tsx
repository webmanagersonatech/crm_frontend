"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select, { SingleValue } from "react-select";
import toast from "react-hot-toast";
import { UserPlus2 } from "lucide-react";
import { createLead, Lead } from "@/app/lib/request/leadRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { getSettingsByInstitute } from "@/app/lib/request/settingRequest";
import { Country, State, City } from "country-state-city";

interface OptionType {
  value: string;
  label: string;
}

export default function AddLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [programOptions, setProgramOptions] = useState<OptionType[]>([]);
  const [countryOptions, setCountryOptions] = useState<OptionType[]>([]);
  const [stateOptions, setStateOptions] = useState<OptionType[]>([]);
  const [cityOptions, setCityOptions] = useState<OptionType[]>([]);
  const [showInstituteDropdown, setShowInstituteDropdown] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<string>("");


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





  // --- Load Institutions & Countries ---
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const activeInstitutions = await getActiveInstitutions();
        setInstitutions(
          activeInstitutions.map((inst: any) => ({
            value: inst.instituteId,
            label: inst.name,
          }))
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to load institutions.");
      }
    };

    const loadCountries = () => {
      const countries = Country.getAllCountries();
      setCountryOptions(
        countries.map((c) => ({ value: c.isoCode, label: c.name }))
      );
    };

    loadInstitutions();
    loadCountries();
  }, []);

  // --- Load Programs when institute changes ---
  useEffect(() => {
    if (!selectedInstitute) {
      setProgramOptions([]);
      setForm((prev) => ({ ...prev, program: "" }));
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
          setForm((prev) => ({ ...prev, program: "" }));
          toast.error("No courses found in institute settings.");
        }
      } catch (error: any) {
        console.error(error);
        setProgramOptions([]);
        setForm((prev) => ({ ...prev, program: "" }));
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
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // --- Dropdown Change Handler (Fixed for country/state names) ---
  const handleSelectChange = (name: keyof Lead, selected: SingleValue<OptionType>) => {
    let newValue = selected?.value || "";

    // Store full names for country & state
    if (name === "country" || name === "state") {
      newValue = selected?.label || "";
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));

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
    setLoading(true);

    if (!form.instituteId) {
      toast.error("Institute is required.");
      setLoading(false);
      return;
    }
    if (!form.program) {
      toast.error("Program is required.");
      setLoading(false);
      return;
    }
    if (!form.candidateName) {
      toast.error("Candidate name is required.");
      setLoading(false);
      return;
    }
    if (!form.phoneNumber) {
      toast.error("Phone number is required.");
      setLoading(false);
      return;
    }
    if (!form.dateOfBirth) {
      toast.error("Date of birth is required.");
      setLoading(false);
      return;
    }
    if (!form.country) {
      toast.error("Country is required.");
      setLoading(false);
      return;
    }
    if (!form.state) {
      toast.error("State is required.");
      setLoading(false);
      return;
    }
    if (!form.city) {
      toast.error("City is required.");
      setLoading(false);
      return;
    }
    if (!form.communication) {
      toast.error("Communication is required.");
      setLoading(false);
      return;
    }
    if (!form.followUpDate) {
      toast.error("Follow-up date is required.");
      setLoading(false);
      return;
    }

    try {
      await createLead(form);
      toast.success("Lead created successfully!");
      router.push("/leads");
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

  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: "#d1d5db",
      borderRadius: "0.375rem",
      minHeight: "38px",
      backgroundColor: "white",
      "&:hover": { borderColor: "#3b82f6" },
    }),
    menu: (provided: any) => ({ ...provided, zIndex: 9999 }),
  };

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
          Add Lead
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >
        {/* Institute */}


        {showInstituteDropdown && (<div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Institute  <span className="text-red-500">* </span></label>
          <Select
            options={institutions}
            value={institutions.find((opt) => opt.value === form.instituteId) || null}
            onChange={(selected) => handleSelectChange("instituteId", selected)}
            styles={customSelectStyles}
            isClearable
          />
        </div>)}

        {/* Program */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Program <span className="text-red-500">* </span></label>
          <Select
            options={programOptions}
            value={programOptions.find((opt) => opt.value === form.program) || null}
            onChange={(selected) => handleSelectChange("program", selected)}
            styles={customSelectStyles}
            isClearable
            placeholder="Select Program"
          />
        </div>

        {/* Candidate Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Candidate Name <span className="text-red-500">* </span></label>
          <input
            type="text"
            name="candidateName"
            value={form.candidateName}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* UG Degree */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">UG Degree</label>
          <input
            type="text"
            name="ugDegree"
            value={form.ugDegree}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Phone Number */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Phone Number <span className="text-red-500">* </span></label>
          <input
            type="text"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Date of Birth */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Date of Birth <span className="text-red-500">* </span></label>
          <input
            type="date"
            name="dateOfBirth"
            value={form.dateOfBirth?.toString() || ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Country */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Country <span className="text-red-500">* </span></label>
          <Select
            options={countryOptions}
            value={countryOptions.find((opt) => opt.label === form.country) || null}
            onChange={(selected) => handleSelectChange("country", selected)}
            styles={customSelectStyles}
            isClearable
          />
        </div>

        {/* State */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">State <span className="text-red-500">* </span></label>
          <Select
            options={stateOptions}
            value={stateOptions.find((opt) => opt.label === form.state) || null}
            onChange={(selected) => handleSelectChange("state", selected)}
            styles={customSelectStyles}
            isClearable
          />
        </div>

        {/* City */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">City / Location <span className="text-red-500">* </span></label>
          <Select
            options={cityOptions}
            value={cityOptions.find((opt) => opt.label === form.city) || null}
            onChange={(selected) => handleSelectChange("city", selected)}
            styles={customSelectStyles}
            isClearable
          />
        </div>

        {/* Status */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Status </label>
          <Select
            options={statusOptions}
            value={statusOptions.find((opt) => opt.value === form.status)}
            onChange={(selected) => handleSelectChange("status", selected)}
            styles={customSelectStyles}
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
            styles={customSelectStyles}
          />
        </div>

        {/* Follow Up Date */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Follow Up Date <span className="text-red-500">* </span></label>
          <input
            type="date"
            name="followUpDate"
            value={form.followUpDate?.toString() || ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col md:col-span-3">
          <label className="text-sm font-semibold mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
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
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
