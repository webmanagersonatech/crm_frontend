'use client'

import { useState, useEffect } from 'react'
import Select from 'react-select'
import toast, { Toaster } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'

import { getActiveInstitutions } from '@/app/lib/request/institutionRequest'
import { createDynamicForm } from '@/app/lib/request/dynamicfromRequest'
// ===============================
// Types
// ===============================
interface InstituteOption {
  value: string
  label: string
}

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  options?: string[]
}

// ===============================
// Utils
// ===============================
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const normalize = (val: string) => val.trim().toLowerCase()

// ===============================
// Page
// ===============================
export default function AddDynamicFormPage() {
  const [institutes, setInstitutes] = useState<InstituteOption[]>([])
  const [selectedInstitute, setSelectedInstitute] =
    useState<InstituteOption | null>(null)

  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])

  // Field builder
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState('')
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState('')
  const [loading, setLoading] = useState(false);
  const [showInstituteDropdown, setShowInstituteDropdown] = useState(false);

  // ===============================
  // Load Institutes
  // ===============================

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
          setSelectedInstitute({
            value: effectiveInstituteId,
            label: effectiveInstituteId,
          });
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


  useEffect(() => {
    if (!showInstituteDropdown) return;
    const loadInstitutes = async () => {
      try {
        const res = await getActiveInstitutions()
        setInstitutes(
          res.map((i: any) => ({
            value: i.instituteId,
            label: i.name,
          }))
        )
      } catch {
        toast.error('Failed to load institutes')
      }
    }

    loadInstitutes()
  }, [showInstituteDropdown])

  // ===============================
  // Check duplicate field
  // ===============================
  const fieldAlreadyExists = (label: string) => {
    return fields.some(
      (f) => normalize(f.label) === normalize(label)
    )
  }

  // ===============================
  // Add Field
  // ===============================
  const addField = () => {
    if (!fieldLabel || !fieldType) {
      return toast.error('Field label and type are required')
    }

    if (fieldAlreadyExists(fieldLabel)) {
      return toast.error(`"${fieldLabel}" already exists`)
    }

    const newField: FormField = {
      id: uid(),
      label: fieldLabel.trim(),
      type: fieldType,
      required,
      options:
        ['select', 'radio', 'checkbox'].includes(fieldType) && options
          ? options.split(',').map((o) => o.trim())
          : [],
    }

    setFields((prev) => [...prev, newField])

    toast.success(`"${fieldLabel}" added successfully`)

    // Reset builder inputs
    setFieldLabel('')
    setFieldType('')
    setRequired(false)
    setOptions('')
  }

  // ===============================
  // Remove Field
  // ===============================
  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id))
    toast.success('Field removed')
  }

  // ===============================
  // Submit Form
  // ===============================
  const handleSubmit = async () => {
    if (!selectedInstitute) {
      return toast.error('Please select an institute')
    }

    if (!title.trim()) {
      return toast.error('Form title is required')
    }

    if (fields.length === 0) {
      return toast.error('Add at least one field')
    }

    const payload: any = {
      instituteId: selectedInstitute.value,
      title: title.trim(),
      description: description.trim(),
      fields: fields.map(({ id, ...f }) => f),
    }



    try {
      await createDynamicForm(payload)
      toast.success('Dynamic form created successfully')
      router.push('/dynamic-forms')
      // Reset everything
      setTitle('')
      setDescription('')
      setFields([])
      setSelectedInstitute(null)
    } catch {
      toast.error('Failed to create form')
    }
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold">Add Dynamic Form</h1>
      </div>

      {/* Form Details */}
      <div className="border rounded bg-white p-4 space-y-4">
        {showInstituteDropdown &&
          <Select
            options={institutes}
            value={selectedInstitute}
            onChange={(v) => setSelectedInstitute(v)}
            placeholder="Select Institute"
          />}

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Form Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="border rounded px-3 py-2 w-full"
          placeholder="Form Description (optional)"
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
            onChange={(e) => setFieldType(e.target.value)}
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

          {['select', 'radio', 'checkbox'].includes(fieldType) && (
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

        {/* Live Preview */}
        <div className="border rounded bg-white p-4 space-y-3">
          <h2 className="font-semibold">Live Preview</h2>

          {fields.map((f) => (
            <div key={f.id} className="border-b pb-2">
              <label className="text-sm font-semibold block mb-1">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>

              {f.type === 'textarea' ? (
                <textarea disabled className="border rounded px-3 py-2 w-full" />
              ) : f.type === 'select' ? (
                <select disabled className="border rounded px-3 py-2 w-full">
                  <option>Select</option>
                  {f.options?.map((o, i) => (
                    <option key={i}>{o}</option>
                  ))}
                </select>
              ) : f.type === 'radio' ? (
                <div className="flex gap-3">
                  {f.options?.map((o, i) => (
                    <label key={i}>
                      <input disabled type="radio" /> {o}
                    </label>
                  ))}
                </div>
              ) : f.type === 'checkbox' ? (
                <div className="flex gap-3">
                  {f.options?.map((o, i) => (
                    <label key={i}>
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
                onClick={() => removeField(f.id)}
                className="text-red-500 text-sm mt-1"
              >
                Remove
              </button>
            </div>
          ))}

          {fields.length === 0 && (
            <p className="text-gray-400 text-sm text-center">
              No fields added yet
            </p>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => router.push('/dynamic-forms')}
          className="px-6 py-2 border rounded text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Create Form
        </button>
      </div>
    </div>
  )
}
