"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select, { SingleValue } from "react-select";
import toast from "react-hot-toast";
import {
  createInstitution,
  Institution,
} from "@/app/lib/request/institutionRequest";
import { Building2 } from "lucide-react";
import { Country, State, City } from "country-state-city";

interface OptionType {
  value: string;
  label: string;
}

export default function AddInstitutionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<Institution>({
    name: "",
    country: "",
    state: "",
    location: "",
    contactPerson: "",
    email: "",
    phoneNo: "",
    instituteType: "",
    status: "inactive",
  });

  const [selectedCountry, setSelectedCountry] = useState<OptionType | null>(
    null
  );
  const [selectedState, setSelectedState] = useState<OptionType | null>(null);
  const [selectedCity, setSelectedCity] = useState<OptionType | null>(null);

  /** --- Dropdown Data --- */
  const countries: OptionType[] = Country.getAllCountries().map((country) => ({
    value: country.isoCode,
    label: country.name,
  }));

  const states: OptionType[] = selectedCountry
    ? State.getStatesOfCountry(selectedCountry.value).map((state) => ({
      value: state.isoCode,
      label: state.name,
    }))
    : [];

  const cities: OptionType[] =
    selectedCountry && selectedState
      ? City.getCitiesOfState(selectedCountry.value, selectedState.value).map(
        (city) => ({
          value: city.name,
          label: city.name,
        })
      )
      : [];

  /** --- Handlers --- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (
    name: keyof Institution,
    selected: SingleValue<OptionType>
  ) => {
    setForm((prev) => ({ ...prev, [name]: selected?.value || "" }));
  };

  // Keep form in sync when country/state/city change
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      country: selectedCountry?.label || "",
      state: selectedState?.label || "",
      location: selectedCity?.label || "",
    }));
  }, [selectedCountry, selectedState, selectedCity]);

  /** --- Submit --- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createInstitution(form);
      toast.success("Institution created successfully!");
      router.push("/institution");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create institution.");
    } finally {
      setLoading(false);
    }
  };

  /** --- Styles --- */
  const inputClass =
    "border border-[#3a4480] p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#3a4480]";

  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: "#3a4480",
      borderRadius: "0.375rem",
      minHeight: "38px",
      backgroundColor: "white",
      "&:hover": { borderColor: "#3a4480" },
    }),
    menu: (provided: any) => ({ ...provided, zIndex: 9999 }),
  };

  const typeOptions = [
    { value: "School", label: "School" },
    { value: "Polytechnic", label: "Polytechnic" },
    { value: "UG & PG", label: "UG & PG" },
    { value: "Only PG", label: "Only PG" },
    { value: "Company", label: "Company" },
    { value: "Restaurant", label: "Restaurant" },
    { value: "Clinic", label: "Clinic" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  /** --- JSX --- */
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Add Institution
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >
        {/* Institution Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Institution Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            placeholder="Institution Name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

        {/* Country */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Country <span className="text-red-500">*</span>
          </label>
          <Select

            options={countries}
            value={selectedCountry}
            onChange={(val: SingleValue<OptionType>) => {
              setSelectedCountry(val);
              setSelectedState(null);
              setSelectedCity(null);
            }}
            placeholder="Select country"
            isSearchable
            styles={customSelectStyles}
          />
        </div>

        {/* State */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            State
          </label>
          <Select
            options={states}
            value={selectedState}
            onChange={(val: SingleValue<OptionType>) => {
              setSelectedState(val);
              setSelectedCity(null);
            }}
            placeholder={
              selectedCountry ? "Select state" : "Select country first"
            }
            isDisabled={!selectedCountry}
            isSearchable
            styles={customSelectStyles}
          />
        </div>

        {/* City / Location */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600  dark:text-gray-300 mb-1">
            City / Location
          </label>
          <Select
            options={cities}

            value={selectedCity}
            onChange={(val: SingleValue<OptionType>) => setSelectedCity(val)}
            placeholder={
              selectedState ? "Select location" : "Select state first"
            }
            isDisabled={!selectedState}
            isSearchable
            styles={customSelectStyles}
          />
        </div>

        {/* Contact Person */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Contact Person
          </label>
          <input
            type="text"
            name="contactPerson"
            placeholder="Contact Person"
            value={form.contactPerson}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Phone Number */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Phone Number
          </label>
          <input
            type="text"
            name="phoneNo"
            placeholder="Phone Number"
            value={form.phoneNo}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Institution Type */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Institution Type
          </label>
          <Select
            options={typeOptions}
            value={typeOptions.find((opt) => opt.value === form.instituteType)}
            onChange={(selected) =>
              handleSelectChange("instituteType", selected)
            }
            styles={customSelectStyles}
          />
        </div>

        {/* Status */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Status
          </label>
          <Select
            options={statusOptions}
            value={statusOptions.find((opt) => opt.value === form.status)}
            onChange={(selected) => handleSelectChange("status", selected)}
            styles={customSelectStyles}
          />
        </div>

        {/* Buttons */}
        <div className="md:col-span-3 flex flex-col sm:flex-row justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => router.push("/institution")}
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
