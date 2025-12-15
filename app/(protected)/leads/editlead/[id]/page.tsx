"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Select, { SingleValue } from "react-select";
import toast from "react-hot-toast";
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

  // ✅ Load institutions & countries
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

  // ✅ Load existing lead details
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

  // ✅ Sync institute selection after institutions load
  useEffect(() => {
    if (institutions.length && form.instituteId) {
      setSelectedInstitute(form.instituteId);
    }
  }, [institutions, form.instituteId]);

  // ✅ Load programs when institute changes
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

  // ✅ Input handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof Lead, selected: SingleValue<OptionType>) => {
    let newValue = selected?.value || "";
    if (name === "country" || name === "state") newValue = selected?.label || "";

    setForm(prev => ({ ...prev, [name]: newValue }));

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

  // ✅ Save updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
      };
      await updateLead(id as string, payload);
      toast.success("Lead updated successfully!");
      router.push("/leads");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update lead.");
    } finally {
      setLoading(false);
    }
  };

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

  if (!form.candidateName && !loading)
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
          <label className="text-sm font-semibold mb-1">Program *</label>
          <Select
            options={programOptions}
            value={programOptions.find(opt => opt.value === form.program) || null}
            onChange={selected => handleSelectChange("program", selected)}
            styles={customSelectStyles}
            isClearable
          />
        </div>

        {/* Candidate Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Candidate Name *</label>
          <input
            type="text"
            name="candidateName"
            value={form.candidateName || ""}
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
            value={form.ugDegree || ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Phone Number</label>
          <input
            type="text"
            name="phoneNumber"
            value={form.phoneNumber || ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* DOB */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Date of Birth</label>
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
          <label className="text-sm font-semibold mb-1">Country</label>
          <Select
            options={countryOptions}
            value={countryOptions.find(opt => opt.label === form.country) || null}
            onChange={selected => handleSelectChange("country", selected)}
            styles={customSelectStyles}
            isClearable
          />
        </div>

        {/* State */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">State</label>
          <Select
            options={stateOptions}
            value={stateOptions.find(opt => opt.label === form.state) || null}
            onChange={selected => handleSelectChange("state", selected)}
            styles={customSelectStyles}
            isClearable
          />
        </div>

        {/* City */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">City</label>
          <Select
            options={cityOptions}
            value={cityOptions.find(opt => opt.label === form.city) || null}
            onChange={selected => handleSelectChange("city", selected)}
            styles={customSelectStyles}
            isClearable
          />
        </div>

        {/* Status */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Status</label>
          <Select
            options={statusOptions}
            value={statusOptions.find(opt => opt.value === form.status)}
            onChange={selected => handleSelectChange("status", selected)}
            styles={customSelectStyles}
          />
        </div>

        {/* Communication */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Communication</label>
          <Select
            options={communicationOptions}
            value={communicationOptions.find(opt => opt.value === form.communication)}
            onChange={selected => handleSelectChange("communication", selected)}
            styles={customSelectStyles}
          />
        </div>

        {/* Follow Up Date */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Follow Up Date</label>
          <input
            type="date"
            name="followUpDate"
            value={form.followUpDate || ""}
            onChange={handleChange}
            className={inputClass}
          />
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
