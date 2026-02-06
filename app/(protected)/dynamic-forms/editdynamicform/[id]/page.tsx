"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";;
import { ClipboardEdit } from "lucide-react";

import {
  getDynamicFormById,
  updateDynamicForm,
} from "@/app/lib/request/dynamicfromRequest";

// ===============================
// Types
// ===============================
type FieldType =
  | "text"
  | "number"
  | "email"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "textarea"
  | "file";

interface FormField {
  id?: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

// ===============================
// Component
// ===============================
export default function EditDynamicFormPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);

  // Builder state
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType | "">("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");

  // ===============================
  // Load Form
  // ===============================
  useEffect(() => {
    if (!id) return;

    const loadForm = async () => {
      try {
        const res = await getDynamicFormById(id as string);

        setTitle(res.title);
        setDescription(res.description || "");
        setFields(res.fields || []);
      } catch {
        toast.error("Failed to load form");
        router.push("/dynamic-forms");
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [id, router]);

  // ===============================
  // Check Duplicate Field
  // ===============================
  const fieldAlreadyExists = (label: string, type: FieldType) =>
    fields.some((f) => f.label.toLowerCase() === label.toLowerCase() && f.type === type);

  // ===============================
  // Add Field
  // ===============================
  const addField = () => {
    if (!fieldLabel || !fieldType) {
      return toast.error("Field label and type are required");
    }

    if (fieldAlreadyExists(fieldLabel, fieldType as FieldType)) {
      return toast.error(`Field "${fieldLabel}" with type "${fieldType}" already exists`);
    }

    const newField: FormField = {
      label: fieldLabel.trim(),
      type: fieldType as FieldType,
      required,
      options:
        ["select", "radio", "checkbox"].includes(fieldType) && options
          ? options.split(",").map((o) => o.trim())
          : [],
    };

    setFields((prev) => [...prev, newField]);

    // Reset builder inputs
    setFieldLabel("");
    setFieldType("");
    setRequired(false);
    setOptions("");
  };

  // ===============================
  // Remove Field
  // ===============================
  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  // ===============================
  // Update Form
  // ===============================
  const handleUpdate = async () => {
    if (!title.trim()) {
      return toast.error("Form title is required");
    }

    if (fields.length === 0) {
      return toast.error("Add at least one field");
    }

    try {
      await updateDynamicForm(id as string, {
        title: title.trim(),
        description: description.trim(),
        fields,
      });

      toast.success("Form updated successfully");
      router.push("/dynamic-forms");
    } catch {
      toast.error("Failed to update form");
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  // ===============================
  // UI
  // ===============================
  return (
    <div className="p-6 space-y-6">
      

      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardEdit className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold">Edit Dynamic Form</h1>
      </div>

      {/* Form Details */}
      <div className="border rounded bg-white p-4 space-y-4">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Form Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="border rounded px-3 py-2 w-full"
          placeholder="Form Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Builder + Preview */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Field Builder */}
        <div className="border rounded bg-white p-4 space-y-4">
          <h2 className="font-semibold">Field Builder</h2>

          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Field Label"
            value={fieldLabel}
            onChange={(e) => setFieldLabel(e.target.value)}
          />

          <select
            className="border rounded px-3 py-2 w-full"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
          >
            <option value="">Select Field Type</option>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="email">Email</option>
            <option value="date">Date</option>
            <option value="textarea">Textarea</option>
            <option value="select">Select</option>
            <option value="radio">Radio</option>
            <option value="checkbox">Checkbox</option>
            <option value="file">File</option>
          </select>

          {["select", "radio", "checkbox"].includes(fieldType) && (
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Options (comma separated)"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
            />
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            Required
          </label>

          <button
            onClick={addField}
            className="w-full py-2 bg-blue-600 text-white rounded"
          >
            Add Field
          </button>
        </div>

        {/* Preview */}
        <div className="border rounded bg-white p-4 space-y-3">
          <h2 className="font-semibold">Fields</h2>

          {fields.map((f, i) => (
            <div key={i} className="border-b pb-2">
              <p className="font-medium">
                {f.label} {f.required && "*"}
              </p>

              {/* Live preview input */}
              {f.type === "textarea" ? (
                <textarea disabled className="border rounded px-3 py-2 w-full" />
              ) : f.type === "select" ? (
                <select disabled className="border rounded px-3 py-2 w-full">
                  <option>Select</option>
                  {f.options?.map((o, idx) => (
                    <option key={idx}>{o}</option>
                  ))}
                </select>
              ) : f.type === "radio" ? (
                <div className="flex gap-3">
                  {f.options?.map((o, idx) => (
                    <label key={idx}>
                      <input disabled type="radio" /> {o}
                    </label>
                  ))}
                </div>
              ) : f.type === "checkbox" ? (
                <div className="flex gap-3">
                  {f.options?.map((o, idx) => (
                    <label key={idx}>
                      <input disabled type="checkbox" /> {o}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  disabled
                  type={f.type}
                  className="border rounded px-3 py-2 w-full"
                />
              )}

              <button
                onClick={() => removeField(i)}
                className="text-red-500 text-sm mt-1"
              >
                Remove
              </button>
            </div>
          ))}

          {fields.length === 0 && (
            <p className="text-gray-400 text-sm text-center">No fields added yet</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => router.push("/dynamic-forms")}
          className="px-6 py-2 border rounded"
        >
          Cancel
        </button>

        <button
          onClick={handleUpdate}
          className="px-6 py-2 bg-green-600 text-white rounded"
        >
          Update Form
        </button>
      </div>
    </div>
  );
}
