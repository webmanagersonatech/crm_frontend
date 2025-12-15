"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Select, { SingleValue } from "react-select";
import toast from "react-hot-toast";
import {
  getInstitutionById,
  updateInstitution,
  Institution,
} from "@/app/lib/request/institutionRequest";
import { Building2 } from "lucide-react";
import { Country, State, City } from "country-state-city";
import Spinner from "@/components/Spinner";
import BackButton from "@/components/BackButton";

interface OptionType {
  value: string;
  label: string;
}

export default function EditInstitutionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

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

  const [selectedCountry, setSelectedCountry] = useState<OptionType | null>(null);
  const [selectedState, setSelectedState] = useState<OptionType | null>(null);
  const [selectedCity, setSelectedCity] = useState<OptionType | null>(null);

  // --- Dropdown Data ---
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

  // --- Fetch Institution Data ---
  useEffect(() => {
    async function fetchInstitution() {
      if (!id) return;

      try {
        setLoadingData(true);
        const data = await getInstitutionById(id);
        setForm(data);

        // Pre-select country/state/city
        const countryObj = Country.getAllCountries().find(
          (c) => c.name === data.country
        );
        if (countryObj)
          setSelectedCountry({ value: countryObj.isoCode, label: countryObj.name });

        const stateObj =
          countryObj &&
          State.getStatesOfCountry(countryObj.isoCode).find(
            (s) => s.name === data.state
          );
        if (stateObj)
          setSelectedState({ value: stateObj.isoCode, label: stateObj.name });

        const cityObj =
          countryObj &&
          stateObj &&
          City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode).find(
            (ct) => ct.name === data.location
          );
        if (cityObj)
          setSelectedCity({ value: cityObj.name, label: cityObj.name });
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch institution.");
      } finally {
        setLoadingData(false);
      }
    }

    fetchInstitution();
  }, [id]);

  // --- Handle Change ---
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

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      country: selectedCountry?.label || "",
      state: selectedState?.label || "",
      location: selectedCity?.label || "",
    }));
  }, [selectedCountry, selectedState, selectedCity]);

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return toast.error("Missing institution ID.");

    setLoading(true);
    try {
      await updateInstitution(id, form);
      toast.success("Institution updated successfully!");
      router.push("/institution");
    } catch (error: any) {
      toast.error(error.message || "Failed to update institution.");
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

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-600">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 ">
        <Building2 className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Edit Institution
        </h1>

      </div>
      {/* <BackButton /> */}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >
        {/* Institution Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Institution Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

        {/* Country */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Country</label>
          <Select
            options={countries}
            value={selectedCountry}
            onChange={(val) => {
              setSelectedCountry(val);
              setSelectedState(null);
              setSelectedCity(null);
            }}
            styles={customSelectStyles}
          />
        </div>

        {/* State */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">State</label>
          <Select
            options={states}
            value={selectedState}
            onChange={(val) => {
              setSelectedState(val);
              setSelectedCity(null);
            }}
            isDisabled={!selectedCountry}
            styles={customSelectStyles}
          />
        </div>

        {/* City */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">City / Location</label>
          <Select
            options={cities}
            value={selectedCity}
            onChange={(val) => setSelectedCity(val)}
            isDisabled={!selectedState}
            styles={customSelectStyles}
          />
        </div>

        {/* Contact Person */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Contact Person</label>
          <input
            type="text"
            name="contactPerson"
            value={form.contactPerson}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Phone Number</label>
          <input
            type="text"
            name="phoneNo"
            value={form.phoneNo}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Institution Type */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Institution Type</label>
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
          <label className="text-sm font-semibold mb-1">Status</label>
          <Select
            options={statusOptions}
            value={statusOptions.find((opt) => opt.value === form.status)}
            onChange={(selected) => handleSelectChange("status", selected)}
            styles={customSelectStyles}
          />
        </div>

        {/* Buttons */}
        <div className="md:col-span-3 flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => router.push("/institution")}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {loading ? "Updating..." : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
