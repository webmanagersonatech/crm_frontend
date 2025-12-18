'use client'

import { useState, useEffect } from 'react'
import Select from 'react-select'
import toast, { Toaster } from 'react-hot-toast'
import {
  saveFormConfiguration,
  getFormByInstituteId,
} from '@/app/lib/request/formManager'
import { getActiveInstitutions } from '@/app/lib/request/institutionRequest'

// ===============================
// Interfaces
// ===============================
interface InstituteData {
  id: string
  name: string
}

interface FieldConfig {
  id?: string // unique id for local operations (delete, edit)
  instituteId: string
  fieldType: string
  maxLength?: number
  fieldName: string
  fieldFor: 'Personal' | 'Education'
  sectionName?: string
  visibility: 'Yes' | 'No'
  required: boolean
  options?: string[]
  acceptedFileTypes?: string
}

interface FormManager {
  instituteId: string
  personalFields: FieldConfig[]
  educationFields: FieldConfig[]
}

// small uid helper
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

// ===============================
// Component
// ===============================
export default function SettingsPage() {
  const [institutes, setInstitutes] = useState<InstituteData[]>([])
  const [selectedInstitute, setSelectedInstitute] =
    useState<InstituteData | null>(null)
  const [fields, setFields] = useState<FieldConfig[]>([])

  const [fieldFor, setFieldFor] = useState<'Personal' | 'Education'>('Personal')
  const [activeTab, setActiveTab] = useState<'Personal' | 'Education'>('Personal')

  const [customMode, setCustomMode] = useState(false)
  const [fieldType, setFieldType] = useState('')
  const [maxLength, setMaxLength] = useState<number | ''>('')
  const [fieldName, setFieldName] = useState('')
  const [sectionName, setSectionName] = useState('')
  const [visibility, setVisibility] = useState<'Yes' | 'No'>('Yes')
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState('')

  // ===============================
  // Load Institutes
  // ===============================
  useEffect(() => {
    const loadInstitutes = async () => {
      try {
        const res = await getActiveInstitutions()
        const mapped = res.map((inst: any) => ({
          id: inst.instituteId,
          name: inst.name,
        }))
        setInstitutes(mapped)
      } catch {
        toast.error('Failed to load institutes')
      }
    }
    loadInstitutes()
  }, [])


  const fieldExists = (
    fieldName: string,
    fieldFor: 'Personal' | 'Education'
  ) => {
    return fields.some(
      (f) =>
        f.fieldFor === fieldFor &&
        f.fieldName.trim().toLowerCase() === fieldName.trim().toLowerCase()
    )
  }

  // ===============================
  // Predefined Fields
  // ===============================
  const predefinedFields: Record<
    'Personal' | 'Education',
    Array<{
      fieldName: string
      fieldType: string
      required: boolean
      options?: string[]
    }>
  > = {
    Personal: [
      { fieldName: 'First Name', fieldType: 'text', required: true },
      { fieldName: 'Last Name', fieldType: 'text', required: true },
      { fieldName: 'Full Name', fieldType: 'text', required: true },

      { fieldName: 'Date of Birth', fieldType: 'date', required: true },

      {
        fieldName: 'Gender',
        fieldType: 'select',
        required: true,
        options: ['Male', 'Female', 'Other'],
      },

      {
        fieldName: 'Community',
        fieldType: 'select',
        required: true,
        options: [
          'OC',
          'BC',
          'BCM',
          'MBC',
          'DNC',
          'SC',
          'ST',
          'SCA',
          'Other',
        ],
      },

      { fieldName: 'Nationality', fieldType: 'text', required: true },
      { fieldName: 'Contact Number', fieldType: 'number', required: true },
      { fieldName: 'Email Address', fieldType: 'email', required: true },
      { fieldName: 'Address', fieldType: 'textarea', required: true },

      { fieldName: 'Father Name', fieldType: 'text', required: true },
      { fieldName: 'Father Qualification', fieldType: 'text', required: false },
      { fieldName: 'Father Occupation', fieldType: 'text', required: false },

      { fieldName: 'Mother Name', fieldType: 'text', required: true },
      { fieldName: 'Mother Qualification', fieldType: 'text', required: false },
      { fieldName: 'Mother Occupation', fieldType: 'text', required: false },

      { fieldName: 'Annual Income', fieldType: 'number', required: true },

      { fieldName: 'Student Image', fieldType: 'file', required: false },
    ],

    Education: [
      // ---------- 10th ----------
      { fieldName: '10th School Name', fieldType: 'text', required: true },
      { fieldName: '10th Marks / Percentage', fieldType: 'number', required: true },
      { fieldName: '10th Year of Passing', fieldType: 'number', required: true },
      { fieldName: '10th Marksheet', fieldType: 'file', required: false },

      // ---------- 12th ----------
      { fieldName: '12th School Name', fieldType: 'text', required: true },
      { fieldName: '12th Marks / Percentage', fieldType: 'number', required: true },
      { fieldName: '12th Year of Passing', fieldType: 'number', required: true },
      { fieldName: '12th Marksheet', fieldType: 'file', required: false },

      // Course selection
      { fieldName: 'Course Applying For', fieldType: 'text', required: true },
    ],
  }


  // ===============================
  // Load Existing Configuration (add local ids)
  // ===============================
  useEffect(() => {
    const loadConfig = async () => {
      if (!selectedInstitute) return
      try {
        const res = await getFormByInstituteId(selectedInstitute.id)
        const data = res?.data?.[0]
        if (data) {
          const merged: FieldConfig[] = [
            ...(data.personalFields || []),
            ...(data.educationFields || []),
          ].map((f: FieldConfig) => ({
            // give each loaded field a stable id if not present
            id: f.id || uid(),
            // preserve other props
            instituteId: f.instituteId || selectedInstitute.id,
            fieldType: f.fieldType,
            maxLength: f.maxLength,
            fieldName: f.fieldName,
            fieldFor: f.fieldFor,
            sectionName: f.sectionName,
            visibility: f.visibility ?? 'Yes',
            required: f.required ?? false,
            options: f.options ?? [],
            acceptedFileTypes: f.acceptedFileTypes,
          }))
          setFields(merged)
          toast.success('Loaded existing configuration')
        } else {
          setFields([])
        }
      } catch {
        toast.error('Failed to load configuration')
      }
    }
    loadConfig()
  }, [selectedInstitute])

  // ===============================
  // Add Predefined Field
  // ===============================
  const handleAddPredefinedField = (value: string) => {

    if (!selectedInstitute) return toast.error('Select an institute first')
    if (value === 'custom') {
      setCustomMode(true)
      return
    }
    setCustomMode(false)

    if (fieldExists(value, fieldFor)) {
      toast.error(`${value} already exists`)
      return
    }



    const setList = predefinedFields[fieldFor]
    const field = setList.find((f) => f.fieldName === value)
    if (!field) return
    const newField: FieldConfig = {
      id: uid(),
      instituteId: selectedInstitute.id,
      fieldFor,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      visibility: 'Yes',
      required: field.required,
      options: field.options || [],
    }
    setFields((prev) => [...prev, newField])
    toast.success(`${field.fieldName} added!`)
  }

  // ===============================
  // Add Custom Field
  // ===============================
  const handleAddCustomField = () => {
    if (!selectedInstitute) return toast.error('Select an institute first')
    if (!fieldName || !fieldType)
      return toast.error('Field name and type required')

    if (fieldExists(fieldName, fieldFor)) {
      toast.error(`${fieldName} already exists`)
      return
    }


    const newField: FieldConfig = {
      id: uid(),
      instituteId: selectedInstitute.id,
      fieldFor,
      fieldType,
      fieldName,
      maxLength: maxLength ? Number(maxLength) : undefined,
      sectionName,
      visibility,
      required,
      options:
        ['select', 'radiobutton', 'checkbox'].includes(fieldType) && options
          ? options.split(',').map((o) => o.trim())
          : [],
    }

    setFields((prev) => [...prev, newField])
    resetCustomInputs()
    toast.success('Custom field added!')
  }

  const resetCustomInputs = () => {
    setFieldType('')
    setFieldName('')
    setMaxLength('')
    setSectionName('')
    setVisibility('Yes')
    setRequired(false)
    setOptions('')
  }

  // ===============================
  // Remove Field (by id)
  // ===============================
  const handleRemoveField = (id?: string) => {
    if (!id) return
    setFields((prev) => prev.filter((f) => f.id !== id))
    toast.success('Field removed!')
  }

  // ===============================
  // Submit
  // ===============================
  const handleSubmit = async () => {
    if (!selectedInstitute) return toast.error('Please select an institute')
    if (fields.length === 0) return toast.error('No fields to submit')

    const personalFields = fields
      .filter((f) => f.fieldFor === 'Personal')
      .map((f) => {
        // strip local-only props (like id) if backend doesn't expect them
        const { id, ...rest } = f
        return rest
      })
    const educationFields = fields
      .filter((f) => f.fieldFor === 'Education')
      .map((f) => {
        const { id, ...rest } = f
        return rest
      })

    const payload: FormManager = {
      instituteId: selectedInstitute.id,
      personalFields,
      educationFields,
    }

    try {
      const res = await saveFormConfiguration(payload)
      toast.success(res?.message || 'Saved successfully!')
    } catch {
      toast.error('Failed to save')
    }
  }

  // ===============================
  // Styles
  // ===============================
  const inputClass =
    'border rounded px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none w-full'

  // ===============================
  // Render
  // ===============================
  return (
    <div className="p-6 space-y-8">
      <Toaster position="top-right" />

      {/* Select Institute */}
      <div className="border rounded">
        <div className=" bg-gradient-to-b from-[#2a3970] to-[#5667a8]

text-white px-4 py-2 font-semibold rounded-t">
          Select Institute
        </div>
        <div className="p-4 bg-white">
          <Select
            options={institutes.map((i) => ({ value: i.id, label: i.name }))}
            value={
              selectedInstitute
                ? { value: selectedInstitute.id, label: selectedInstitute.name }
                : null
            }
            onChange={(sel) => {
              const inst =
                institutes.find((i) => i.id === sel?.value) || null
              setSelectedInstitute(inst)
            }}
            placeholder="Choose institute"
          />
        </div>
      </div>

      {/* Field Builder & Preview */}
      {selectedInstitute && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left - Field Builder */}
          <div className="border rounded">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8]
 text-white px-4 py-2 font-semibold rounded-t">
              Field Builder
            </div>
            <div className="p-4 bg-white space-y-4">
              {/* Field For */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block ">
                  Field For
                </label>
                <select
                  className={inputClass}
                  value={fieldFor}
                  onChange={(e) =>
                    setFieldFor(e.target.value as 'Personal' | 'Education')
                  }
                >
                  <option value="Personal">Personal</option>
                  <option value="Education">Education</option>
                </select>
              </div>

              {/* Select Predefined Field */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">
                  Select Field
                </label>
                <select
                  className={inputClass}
                  onChange={(e) => handleAddPredefinedField(e.target.value)}
                >
                  <option value="">Select...</option>
                  {predefinedFields[fieldFor].map((f) => (
                    <option key={f.fieldName} value={f.fieldName}>
                      {f.fieldName}
                    </option>
                  ))}
                  <option value="custom">➕ Custom Field</option>
                </select>
              </div>

              {/* Custom Field Builder */}
              {customMode && (
                <div className="border p-4 rounded bg-gray-50 space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">
                      Field Name
                    </label>
                    <input
                      className={inputClass}
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">
                      Field Type
                    </label>
                    <select
                      className={inputClass}
                      value={fieldType}
                      onChange={(e) => setFieldType(e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="date">Date</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="radiobutton">Radio Button</option>
                      <option value="file">File Upload</option>
                    </select>
                  </div>

                  {(fieldType === 'select' ||
                    fieldType === 'radiobutton' ||
                    fieldType === 'checkbox') && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">
                          Options (comma separated)
                        </label>
                        <input
                          className={inputClass}
                          value={options}
                          onChange={(e) => setOptions(e.target.value)}
                          placeholder="e.g. Option1,Option2"
                        />
                      </div>
                    )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={required}
                      onChange={(e) => setRequired(e.target.checked)}
                    />
                    <label className="text-sm font-semibold text-gray-600">
                      Required Field
                    </label>
                  </div>

                  <button
                    onClick={handleAddCustomField}
                    className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    Add Custom Field
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t">
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition w-full"
              >
                Submit All
              </button>
            </div>
          </div>

          {/* Right - Live Preview */}
          <div className="border rounded">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8]
text-white px-4 py-2 font-semibold rounded-t">
              Live Preview
            </div>
            <div className="flex border-b bg-white">
              {['Personal', 'Education'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'Personal' | 'Education')}
                  className={`flex-1 px-4 py-2 font-semibold ${activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab} Fields
                </button>
              ))}
            </div>

            <div className="p-4 bg-white max-h-[320px] overflow-y-auto space-y-3">
              {fields
                .filter((f) => f.fieldFor === activeTab)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-2 border-b pb-2"
                  >
                    <div className="flex-1">
                      <label className="text-sm font-semibold text-gray-700 block mb-1">
                        {f.fieldName}{' '}
                        {f.required && <span className="text-red-500">*</span>}
                      </label>

                      {/* Render realistic preview control by type */}
                      {f.fieldType === 'textarea' ? (
                        <textarea
                          disabled
                          className="border rounded px-3 py-2 text-sm text-gray-600 w-full"
                          placeholder={`[${f.fieldType}]`}
                        />
                      ) : f.fieldType === 'select' ? (
                        <select disabled className="border rounded px-3 py-2 text-sm text-gray-600 w-full">
                          <option>{`[${f.fieldType}]`}</option>
                          {(f.options || []).map((opt, idx) => (
                            <option key={idx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : f.fieldType === 'checkbox' ? (
                        <div className="flex items-center gap-3">
                          {(f.options && f.options.length > 0) ? (
                            f.options.map((opt, idx) => (
                              <label key={idx} className="text-sm">
                                <input disabled type="checkbox" className="mr-2" /> {opt}
                              </label>
                            ))
                          ) : (
                            <input
                              disabled
                              type="checkbox"
                              className="border rounded text-sm"
                            />
                          )}
                        </div>
                      ) : f.fieldType === 'radiobutton' ? (
                        <div className="flex items-center gap-3">
                          {(f.options || []).map((opt, idx) => (
                            <label key={idx} className="text-sm">
                              <input disabled type="radio" name={f.id} className="mr-2" /> {opt}
                            </label>
                          ))}
                        </div>
                      ) : f.fieldType === 'file' ? (
                        <input disabled type="file" className="border rounded px-3 py-2 text-sm text-gray-600 w-full" />
                      ) : (
                        <input
                          disabled
                          type={f.fieldType}
                          className="border rounded px-3 py-2 text-sm text-gray-600 w-full"
                          placeholder={`[${f.fieldType}]`}
                        />
                      )}
                    </div>

                    <button
                      onClick={() => handleRemoveField(f.id)}
                      className="text-red-500 hover:text-red-700 mt-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}

              {fields.filter((f) => f.fieldFor === activeTab).length === 0 && (
                <p className="text-gray-400 text-sm text-center">
                  No {activeTab} fields yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
