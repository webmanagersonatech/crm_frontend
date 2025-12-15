"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select, { SingleValue } from "react-select";
import toast from "react-hot-toast";
import { UserPlus2, Eye, EyeOff } from "lucide-react";

import {
  createUserRequest,
  CreateUserData,
} from "@/app/lib/request/authRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";

interface OptionType {
  value: string;
  label: string;
}

export default function AddUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<OptionType[]>([]); // 🔹 for dropdown
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<CreateUserData>({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    mobileNo: "",
    designation: "",
    role: "user",
    instituteId: "",
    status: "inactive",
    userType: "",
  });

  /** --- Input Change Handler --- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /** --- Dropdown Change Handler --- */
  const handleSelectChange = (
    name: keyof CreateUserData,
    selected: SingleValue<OptionType>
  ) => {
    setForm((prev) => ({ ...prev, [name]: selected?.value || "" }));
  };

  /** --- Load Active Institutions --- */
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const activeInstitutions = await getActiveInstitutions();

        const options = activeInstitutions.map((inst: any) => ({
          value: inst.instituteId,
          label: `${inst.name}`,
        }));

        setInstitutions(options);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load institutions");
      }
    };

    loadInstitutions();
  }, []);

  /** --- Submit Form --- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // --- VALIDATION ---
    const requiredFields = [
      { field: form.instituteId, name: "Institute" },
      { field: form.firstname, name: "First Name" },
      { field: form.lastname, name: "Last Name" },
      { field: form.username, name: "Username" },
      { field: form.email, name: "Email" },
      { field: form.password, name: "Password" },
      { field: form.mobileNo, name: "Mobile Number" },

    ];

    // Check empty fields
    for (const item of requiredFields) {
      if (!item.field || item.field.trim() === "") {
        toast.error(`${item.name} is required.`);
        setLoading(false);
        return;
      }
    }

    // Role-specific validation
    if (form.role === "user") {
      if (!form.userType || form.userType === "") {
        toast.error("User Type is required for User role.");
        setLoading(false);
        return;
      }
    }
    if (form.role === "admin") {
      delete form.userType; // <-- DO NOT SEND userType
    }
    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Invalid email format.");
      setLoading(false);
      return;
    }

    // Mobile No Validation
    if (!/^[0-9]{10}$/.test(form.mobileNo)) {
      toast.error("Mobile Number must be 10 digits.");
      setLoading(false);
      return;
    }

    // --- SUBMIT ---
    try {
      await createUserRequest(form);
      toast.success("User created successfully!");
      router.push("/users");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };


  /** --- Dropdown Options --- */
  const roleOptions = [
    { value: "superadmin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "user", label: "User" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const userTypeOptions = [
    { value: "our_user", label: "Our User" },
    { value: "third_party", label: "Third Party User" }
  ];


  /** --- Styles --- */
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

  /** --- JSX --- */
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <UserPlus2 className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Add User
        </h1>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >

        {/* Institute Dropdown */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Institute <span className="text-red-500">*</span>
          </label>
          <Select
            options={institutions}
            value={
              institutions.find((opt) => opt.value === form.instituteId) || null
            }
            onChange={(selected) => handleSelectChange("instituteId", selected)}
            styles={customSelectStyles}
            placeholder="Select Institute"
            isClearable

          />
        </div>
        {/* First Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="firstname"
            placeholder="First Name"
            value={form.firstname}
            onChange={handleChange}
            className={inputClass}

          />
        </div>
        {/* Last Name */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lastname"
            placeholder="Last Name"
            value={form.lastname}
            onChange={handleChange}
            className={inputClass}

          />
        </div>

        {/* Role */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Role
          </label>
          <Select
            options={roleOptions}
            value={roleOptions.find((opt) => opt.value === form.role)}
            onChange={(selected) => handleSelectChange("role", selected)}
            styles={customSelectStyles}
          />
        </div>

        {form.role === "user" && (
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
              User Type <span className="text-red-500">*</span>
            </label>
            <Select
              options={userTypeOptions}
              value={userTypeOptions.find((opt) => opt.value === form.userType) || null}
              onChange={(selected) => handleSelectChange("userType", selected)}
              styles={customSelectStyles}
              placeholder="Select User Type"
              isClearable={false}
            // 👈 required only when role = user
            />
          </div>
        )}


        {/* Username */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className={inputClass}


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
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}

          />
        </div>

        {/* Password */}
        <div className="flex flex-col relative">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Password <span className="text-red-500">*</span>
          </label>

          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className={`${inputClass} pr-10`} // add padding for the icon

          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-11 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-300"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Number */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="mobileNo"
            placeholder="Mobile Number"
            value={form.mobileNo}
            onChange={handleChange}
            className={inputClass}

          />
        </div>

        {/* Designation */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Designation
          </label>
          <input
            type="text"
            name="designation"
            placeholder="Designation"
            value={form.designation}
            onChange={handleChange}
            className={inputClass}
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
            onClick={() => router.push("/users")}
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
