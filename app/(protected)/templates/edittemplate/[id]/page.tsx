"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Select, { SingleValue } from "react-select";
import { toast } from "react-toastify";
import { FilePlus } from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import {
  getEmailTemplateById,
  updateEmailTemplateRequest,
} from "@/app/lib/request/emailTemplateRequest";

interface OptionType {
  value: string;
  label: string;
}

interface EmailTemplateForm {
  instituteId: string;
  title: string;
  description: string;
}

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function EditEmailTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<EmailTemplateForm>({
    instituteId: "",
    title: "",
    description: "",
  });

  /* ===============================
     FETCH INSTITUTES
  ================================ */


  /* ===============================
     FETCH TEMPLATE BY ID
  ================================ */
  useEffect(() => {
    if (!templateId) return;

    const fetchTemplate = async () => {
      try {
        const res = await getEmailTemplateById(templateId);
        console.log("Fetched template:", res);

        setForm({
          instituteId: res.instituteId,
          title: res.title,
          description: res.description,
        });
      } catch (error: any) {
        toast.error(error.message || "Failed to fetch template");
      }
    };

    fetchTemplate();
  }, [templateId]);

  /* ===============================
     HANDLERS
  ================================ */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };



  const handleDescriptionChange = (value: string) => {
    setForm((prev) => ({ ...prev, description: value }));
  };

  /* ===============================
     SUBMIT (UPDATE)
  ================================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.instituteId) return toast.error("Institute is required");
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.description.trim()) return toast.error("Description is required");

    setLoading(true);
    try {
      await updateEmailTemplateRequest(templateId, form);
      toast.success("Email template updated successfully!");
      router.push("/templates");
    } catch (error: any) {
      toast.error(error.message || "Failed to update template");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     SELECT STYLES
  ================================ */
  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: "#d1d5db",
      borderRadius: "0.375rem",
      minHeight: "38px",
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 9999,
    }),
  };

  /* ===============================
     UI
  ================================ */
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <FilePlus className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Edit Email Template
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1  gap-4 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow"
      >


        {/* Title */}
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-semibold mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col md:col-span-3 mb-16">
          <label className="text-sm font-semibold mb-1">
            Description <span className="text-red-500">*</span>
          </label>

          <div className="border rounded">
            <ReactQuill
              theme="snow"
              value={form.description}
              onChange={handleDescriptionChange}
            />
          </div>
        </div>


        {/* Buttons */}
        <div className="md:col-span-3 flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => router.push("/templates")}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? "Updating..." : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
