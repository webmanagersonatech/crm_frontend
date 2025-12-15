"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";

export default function AddUserPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    designation: "",
    contactNo: "",
    email: "",
    roleName: null,
    instituteType: null,
    status: null,
  });

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeSelect = (name: string, value: any) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", form);
    router.push("/users");
  };

  const inputClass =
    "border border-gray-300 dark:border-neutral-700 p-2 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500";

  // Options
  const roleOptions = [
    { value: "Admin", label: "Admin" },
    { value: "Editor", label: "Editor" },
    { value: "Viewer", label: "Viewer" },
  ];

  const instituteOptions = [
    { value: "School", label: "School" },
    { value: "Polytechnic", label: "Polytechnic" },
    { value: "UG & PG", label: "UG & PG" },
    { value: "Only PG", label: "Only PG" },
    { value: "Company", label: "Company" },
    { value: "Restaurant", label: "Restaurant" },
    { value: "Clinic", label: "Clinic" },
  ];

  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ];

  // React Select custom styles for blue focus
  const selectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: 38,
      borderRadius: 6,
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,0.3)" : "none",
      backgroundColor: "white",
      "&:hover": { borderColor: "#3b82f6" },
    }),
    menu: (provided: any) => ({ ...provided, zIndex: 9999 }),
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">
        Edit User
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >
        {/* First Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="firstName"
            placeholder="Enter First Name"
            value={form.firstName}
            onChange={handleChangeInput}
            className={inputClass}
            required
          />
        </div>

        {/* Last Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lastName"
            placeholder="Enter Last Name"
            value={form.lastName}
            onChange={handleChangeInput}
            className={inputClass}
            required
          />
        </div>

        {/* User Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            User Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="userName"
            placeholder="Enter User Name"
            value={form.userName}
            onChange={handleChangeInput}
            className={inputClass}
            required
          />
        </div>

        {/* Designation */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Designation <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="designation"
            placeholder="Enter Designation"
            value={form.designation}
            onChange={handleChangeInput}
            className={inputClass}
            required
          />
        </div>

        {/* Contact No */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Contact No <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="contactNo"
            placeholder="Enter Contact No"
            value={form.contactNo}
            onChange={handleChangeInput}
            className={inputClass}
            required
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            placeholder="Enter Email"
            value={form.email}
            onChange={handleChangeInput}
            className={inputClass}
            required
          />
        </div>

        {/* Role Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Role Name <span className="text-red-500">*</span>
          </label>
          <Select
            options={roleOptions}
            value={form.roleName}
            onChange={(val) => handleChangeSelect("roleName", val)}
            placeholder="Select Role"
            styles={selectStyles}
            isClearable
          />
        </div>

        {/* Institute Type */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Institute Type <span className="text-red-500">*</span>
          </label>
          <Select
            options={instituteOptions}
            value={form.instituteType}
            onChange={(val) => handleChangeSelect("instituteType", val)}
            placeholder="Select Institute Type"
            styles={selectStyles}
            isClearable
          />
        </div>

        {/* Status */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Status <span className="text-red-500">*</span>
          </label>
          <Select
            options={statusOptions}
            value={form.status}
            onChange={(val) => handleChangeSelect("status", val)}
            placeholder="Select Status"
            styles={selectStyles}
            isClearable
          />
        </div>

        {/* Buttons */}
        <div className="md:col-span-2 flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => router.push("/users")}
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
