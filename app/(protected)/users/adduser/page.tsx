"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select, { SingleValue } from "react-select";
import toast, { Toaster } from "react-hot-toast";
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
interface Permission {
  id: number;
  moduleName: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  filter: boolean;
  download: boolean;
}
export default function AddUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<OptionType[]>([]); // 🔹 for dropdown
  const [showPassword, setShowPassword] = useState(false);
  const [enablePermissions, setEnablePermissions] = useState(false);


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
  const defaultPermissions: Permission[] = [
    { id: 1, moduleName: "Dashboard", view: false, create: false, edit: false, delete: false, filter: false, download: false },

    { id: 6, moduleName: "Application", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 7, moduleName: "Lead Manager", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 8, moduleName: "Communication", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 9, moduleName: "Reports", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    // { id: 10, moduleName: "Login History", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 11, moduleName: "Events", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 12, moduleName: "Others", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 13, moduleName: "Settings", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 15, moduleName: "Email templates", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 16, moduleName: "Dynamic Forms", view: false, create: false, edit: false, delete: false, filter: false, download: false },

  ];

  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);

  const togglePermission = (
    id: number,
    key: keyof Omit<Permission, "id" | "moduleName">
  ) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [key]: !p[key] } : p
      )
    );
  };

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
  const hasAnyPermissionSelected = () => {
    return permissions.some((perm) =>
      perm.view ||
      perm.create ||
      perm.edit ||
      perm.delete ||
      perm.filter ||
      perm.download
    );
  };

  /** --- Submit Form --- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      /* -------------------- REQUIRED FIELD VALIDATION -------------------- */
      const requiredFields = [
        { value: form.instituteId, label: "Institute" },
        { value: form.firstname, label: "First Name" },
        { value: form.lastname, label: "Last Name" },
        { value: form.username, label: "Username" },
        { value: form.email, label: "Email" },
        { value: form.password, label: "Password" },
        { value: form.mobileNo, label: "Mobile Number" },
      ];

      for (const field of requiredFields) {
        if (!field.value?.trim()) {
          toast.error(`${field.label} is required.`);
          return;
        }
      }

      /* -------------------- ROLE VALIDATION -------------------- */
      if (form.role === "user" && !form.userType) {
        toast.error("User Type is required for User role.");
        return;
      }

      /* -------------------- EMAIL VALIDATION -------------------- */
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        toast.error("Invalid email format.");
        return;
      }

      /* -------------------- MOBILE VALIDATION -------------------- */
      if (!/^\d{10}$/.test(form.mobileNo)) {
        toast.error("Mobile Number must be 10 digits.");
        return;
      }

      /* -------------------- PERMISSION VALIDATION -------------------- */
      if (enablePermissions && !hasAnyPermissionSelected()) {
        toast.error("Please select at least one permission.");
        return;
      }

      /* -------------------- BUILD PAYLOAD -------------------- */
      const payload: any = { ...form };

      if (form.role === "admin") {
        delete payload.userType;
      }

      if (enablePermissions) {

        payload.permissions = permissions.map(({ id, ...rest }) => rest);
      }

      /* -------------------- API CALL -------------------- */
      await createUserRequest(payload);

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
    // { value: "superadmin", label: "Super Admin" },
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
      <Toaster position="top-right" />
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

        {/* Permission Toggle */}
        {/* Permissions Toggle */}
        <div className="flex  justify-between items-center mt-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Add Permissions?
          </span>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enablePermissions}
              onChange={(e) => setEnablePermissions(e.target.checked)}
              className="sr-only peer"
            />

            <div
              className="
        w-14 h-7
        rounded-full
        bg-gray-300
        peer-checked:bg-blue-600
        transition-colors duration-300
        after:content-['']
        after:absolute
        after:top-0.5 after:left-0.5
        after:w-6 after:h-6
        after:bg-white
        after:rounded-full
        after:shadow-sm
        after:transition-transform after:duration-300
        peer-checked:after:translate-x-7
      "
            />
          </label>
        </div>



        {enablePermissions && (
          <div className="md:col-span-3 mt-4 overflow-x-auto">
            <table className="w-full border border-gray-200 dark:border-neutral-700">
              <thead className="bg-gray-100 dark:bg-neutral-800">
                <tr>
                  <th className="p-2 text-left">Module</th>
                  {["view", "create", "edit", "delete", "filter", "download"].map(
                    (p) => (
                      <th key={p} className="p-2 text-center capitalize">
                        {p}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.id} className="border-t">
                    <td className="p-2 font-medium">{perm.moduleName}</td>
                    {(["view", "create", "edit", "delete", "filter", "download"] as const).map(
                      (key) => (
                        <td key={key} className="text-center">
                          <input
                            type="checkbox"
                            checked={perm[key]}
                            onChange={() => togglePermission(perm.id, key)}
                            className="w-4 h-4"
                          />
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
