"use client";

import { useEffect, useState } from "react";
import Select from "react-select";
import { ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { savePermission, getPermissions } from "@/app/lib/request/permissionRequest";

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

interface OptionType {
  value: string;
  label: string;
}

export default function PermissionsPage() {
  const defaultPermissions: Permission[] = [
    { id: 1, moduleName: "Dashboard", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    // { id: 2, moduleName: "Institution", view: false, create: false, edit: false, delete: false, filter: false, download: false },
   
    // { id: 4, moduleName: "Users", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    // { id: 5, moduleName: "Permission", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 6, moduleName: "Application", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 7, moduleName: "Lead Manager", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 8, moduleName: "Communication", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 9, moduleName: "Reports", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    // { id: 10, moduleName: "Login History", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 11, moduleName: "Events", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    // { id: 12, moduleName: "Others", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    { id: 13, moduleName: "Settings", view: false, create: false, edit: false, delete: false, filter: false, download: false },
    // { id: 14, moduleName: "Applications Settings", view: false, create: false, edit: false, delete: false, filter: false, download: false },
  ];

  const [permissions, setPermissions] = useState<Permission[]>(defaultPermissions);
  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [selectedInstitute, setSelectedInstitute] = useState<OptionType | null>(null);
  const [selectedRole, setSelectedRole] = useState<OptionType | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const roleOptions: OptionType[] = [
    { value: "admin", label: "Admin" },
    { value: "user", label: "User" },
  ];

  // 🟦 Load Active Institutions
  useEffect(() => {
    (async () => {
      try {
        const activeInstitutions = await getActiveInstitutions();
        const options = activeInstitutions.map((inst: any) => ({
          value: inst.instituteId,
          label: inst.name,
        }));
        setInstitutions(options);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load institutions");
      }
    })();
  }, []);

  // 🟧 Fetch existing permissions when both selected
  useEffect(() => {
    if (selectedInstitute && selectedRole) {
      (async () => {
        try {
          const response = await getPermissions({
            instituteId: selectedInstitute.value,
            role: selectedRole.value,
          });

          if (response.data && response.data.length > 0) {
            setPermissions(response.data[0].permissions);
            setIsUpdating(true);
            toast.success("Existing permissions loaded ✅");
          } else {
            setPermissions(defaultPermissions);
            setIsUpdating(false);
            toast("No permissions found, creating new.");
          }
        } catch (error: any) {
          console.error("Error loading permissions:", error);
          toast.error(error.message || "Failed to load permissions ❌");
        }
      })();
    }
  }, [selectedInstitute, selectedRole]);

  const togglePermission = (id: number, field: keyof Permission) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: !p[field] } : p))
    );
  };

  const handleSave = async () => {
    if (!selectedInstitute || !selectedRole) {
      toast.error("Please select an Institution and a Role!");
      return;
    }

    const cleanedPermissions = permissions.map(({ id, ...rest }) => rest);

    const payload = {
      instituteId: selectedInstitute.value,
      role: selectedRole.value as "admin" | "user",
      permissions: cleanedPermissions,
    };

    try {
      const response = await savePermission(payload);
      toast.success(
        response.message ||
          (isUpdating ? "Permissions updated successfully ✅" : "Permissions created successfully ✅")
      );
      setIsUpdating(true);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast.error(error.message || "Failed to save permissions ❌");
    }
  };

const customStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    minHeight: 38,
    borderRadius: 6,
    borderColor: state.isFocused ? "#3a4480" : "#3a4480",
    boxShadow: "none",
  }),
  menu: (provided: any) => ({ 
    ...provided, 
    zIndex: 9999 
  }),
};


  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-6 h-6 text-blue-700" />
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Permissions
          </h1>
        </div>

        <div className="flex gap-3 flex-wrap items-center w-full sm:w-auto">
          <div className="w-full sm:w-52">
            <Select
              value={selectedInstitute}
              onChange={setSelectedInstitute}
              options={institutions}
              placeholder="Select Institution"
              styles={customStyles}
              isClearable
            />
          </div>

          <div className="w-full sm:w-52">
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              options={roleOptions}
              placeholder="Select Role"
              styles={customStyles}
              isClearable
            />
          </div>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-gray-200 dark:border-neutral-800 overflow-x-auto">
        <table className="min-w-[800px] w-full text-sm text-left">
          <thead className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            <tr>
              <th className="px-4 py-2">Module Name</th>
              {["view", "create", "edit", "delete", "filter", "download"].map(
                (field) => (
                  <th key={field} className="px-4 py-2 text-center capitalize">
                    {field}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr
                key={perm.id}
                className="border-b border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                <td className="px-4 py-2">{perm.moduleName}</td>
                {(
                  ["view", "create", "edit", "delete", "filter", "download"] as const
                ).map((field) => (
                  <td key={field} className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={perm[field]}
                      onChange={() => togglePermission(perm.id, field)}
                      className="w-4 h-4 text-blue-600 dark:text-blue-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md shadow-md transition"
        >
          {isUpdating ? "Update Permissions" : "Create Permissions"}
        </button>
      </div>
    </div>
  );
}
