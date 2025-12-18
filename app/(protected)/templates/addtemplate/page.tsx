"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select, { SingleValue } from "react-select";
import toast from "react-hot-toast";
import { FilePlus } from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css"; // CSS must be imported at top

import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { createEmailTemplateRequest } from "@/app/lib/request/emailTemplateRequest";

interface OptionType {
  value: string;
  label: string;
}

interface EmailTemplateForm {
  instituteId: string;
  title: string;
  description: string;
}

// Dynamically import ReactQuill for SSR support
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function AddEmailTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showInstituteDropdown, setShowInstituteDropdown] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<string>("");
  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [form, setForm] = useState<EmailTemplateForm>({
    instituteId: "",
    title: "",
    description: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Not authorized: please log in.");
      setLoading(false);
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
      setLoading(false);
    }
  }, []);

  /** --- Load Active Institutions --- */

  useEffect(() => {
    if (!showInstituteDropdown) return; // Skip API call if dropdown not needed

    const loadInstitutions = async () => {
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
    };

    loadInstitutions();
  }, [showInstituteDropdown]);

  /** --- Input Change Handler --- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /** --- Dropdown Change Handler --- */
  const handleSelectChange = (name: "instituteId", selected: SingleValue<OptionType>) => {
    setForm((prev) => ({ ...prev, [name]: selected?.value || "" }));
  };

  /** --- Rich Text Change --- */
  const handleDescriptionChange = (value: string) => {
    setForm((prev) => ({ ...prev, description: value }));
  };

  /** --- Submit Form --- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!form.instituteId) return toast.error("Institute is required");
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.description.trim()) return toast.error("Description is required");

    try {
      await createEmailTemplateRequest(form);
      toast.success("Email template created successfully!");
      router.push("/templates");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  /** --- Styles for Select --- */
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
        <FilePlus className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Add Email Template
        </h1>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >
        {/* Institute Dropdown */}
        {showInstituteDropdown && (<div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Institute <span className="text-red-500">*</span>
          </label>
          <Select
            options={institutions}
            value={institutions.find((opt) => opt.value === form.instituteId) || null}
            onChange={(selected) => handleSelectChange("instituteId", selected)}
            styles={customSelectStyles}
            placeholder="Select Institute"
            isClearable
          />
        </div>)}

        {/* Title */}
        <div
          className={`flex flex-col ${showInstituteDropdown ? "md:col-span-2" : "md:col-span-3"
            }`}
        >
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="border border-gray-300 dark:border-neutral-700 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Template Title"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col md:col-span-3 mb-4">
          <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <div className=" rounded p-2">
            <ReactQuill
              theme="snow"
              value={form.description}
              onChange={handleDescriptionChange}
              className="h-40"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="md:col-span-3 flex flex-col sm:flex-row justify-end gap-2 mt-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => router.push("/templates")}
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
