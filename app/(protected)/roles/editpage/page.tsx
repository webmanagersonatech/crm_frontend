"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";

export default function AddUserPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    RoleName: "",
    status: "",
  });

  // Status options for react-select
  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ];

  const selectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: 38,
      borderRadius: 6,
      borderColor: state.isFocused ? "#3b82f6" : "#3b82f6",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,0.3)" : "none",
      backgroundColor: "white",
      "&:hover": { borderColor: "#3b82f6" },
    }),
    menu: (provided: any) => ({ ...provided, zIndex: 9999 }),
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field?: string
  ) => {
    if (field) {
      setForm((prev) => ({ ...prev, [field]: e }));
    } else {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", form);
    router.push("/roles"); // Redirect after submission
  };

  const inputClass =
    "border border-gray-300 dark:border-neutral-700 p-2 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">
        Edit Role
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >
        {/* Role Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Role Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="RoleName"
            placeholder="Enter Role Name"
            value={form.RoleName}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

        {/* Status using react-select */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Status <span className="text-red-500">*</span>
          </label>
          <Select
            options={statusOptions}
            value={statusOptions.find((opt) => opt.value === form.status)}
            onChange={(val: any) =>
              setForm((prev) => ({ ...prev, status: val?.value }))
            }
            styles={selectStyles}
            placeholder="Select Status"
            isClearable
          />
        </div>

        {/* Buttons */}
        <div className="md:col-span-2 flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => router.push("/roles")}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
