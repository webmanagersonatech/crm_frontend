'use client'

import { useState, useEffect } from 'react'
import Select from 'react-select'
import { toast } from "react-toastify";
import {
  saveFormConfiguration,
} from '@/app/lib/request/formManager'
import { getActiveInstitutions } from '@/app/lib/request/institutionRequest'
import { getFormByInstituteId } from '@/app/lib/request/formManager'
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core'
import BackButton from '@/components/BackButton'
import { Settings2 } from 'lucide-react'

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'

/* ===============================
   Types
================================ */
interface InstituteData {
  id: string
  name: string
}

interface FieldConfig {
  id: string
  instituteId: string
  fieldFor: 'Personal' | 'Education'
  sectionName: string
  fieldType: string
  fieldName: string
  required: boolean
  visibility: 'Yes' | 'No'
  options?: string[]
  maxLength?: number
  acceptedFileTypes?: string[]
}



const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/* ===============================
   Component
================================ */

function SortableField({
  field,
  inputClass,
  onRemove,
}: {
  field: FieldConfig
  inputClass: string
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }



  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border p-2 rounded mb-3 bg-white"
    >
      <div className="flex justify-between items-center mb-1">
        <label
          className="text-sm font-medium cursor-move"
          {...attributes}
          {...listeners}
        >
          ⠿ {field.fieldName} {field.required && '*'}
        </label>

        <button
          onClick={() => onRemove(field.id)}
          className="text-red-500 text-xs"
        >
           Remove
        </button>
      </div>

      {field.fieldType === 'textarea' ? (
        <textarea disabled className={inputClass} />
      ) : field.fieldType === 'select' ? (
        <select disabled className={inputClass}>
          <option>Select</option>
          {field.options?.map((o, i) => (
            <option key={i}>{o}</option>
          ))}
        </select>
      ) : field.fieldType === 'checkbox' ? (
        <div className="flex gap-3">
          {field.options?.map((o, i) => (
            <label key={i} className="text-sm">
              <input type="checkbox" disabled /> {o}
            </label>
          ))}
        </div>
      ) : field.fieldType === 'radiobutton' ? (
        <div className="flex gap-3">
          {field.options?.map((o, i) => (
            <label key={i} className="text-sm">
              <input type="radio" disabled /> {o}
            </label>
          ))}
        </div>
      ) : (
        <input disabled className={inputClass} />
      )}
    </div>
  )
}


const buildSectionPayload = (
  fields: FieldConfig[],
  category: 'Personal' | 'Education'
) => {
  const grouped: Record<string, any[]> = {}

  fields
    .filter(f => f.fieldFor === category)
    .forEach(f => {
      if (!grouped[f.sectionName]) {
        grouped[f.sectionName] = []
      }

      grouped[f.sectionName].push({
        fieldName: f.fieldName,
        label: f.fieldName,
        type: f.fieldType,
        required: f.required,
        options: f.options,
        maxLength: f.maxLength,
        multiple: false,
      })
    })

  return Object.keys(grouped).map(section => ({
    sectionName: section,
    fields: grouped[section],
  }))
}

export default function SettingsPage() {
  const [institutes, setInstitutes] = useState<InstituteData[]>([])
  const [selectedInstitute, setSelectedInstitute] =
    useState<InstituteData | null>(null)

  const [fields, setFields] = useState<FieldConfig[]>([])

  const [fieldFor, setFieldFor] =
    useState<'Personal' | 'Education'>('Personal')

  const [sectionName, setSectionName] = useState('')
  const [customSection, setCustomSection] = useState('')
  const [previewTab, setPreviewTab] =
    useState<'Personal' | 'Education'>('Personal')

  const [customMode, setCustomMode] = useState(false)
  const [fieldName, setFieldName] = useState('')
  const [maxLength, setMaxLength] = useState<number | ''>('')
  const [fieldType, setFieldType] = useState('')
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState('')

  useEffect(() => {
    const loadConfig = async () => {
      if (!selectedInstitute) return

      try {
        const res = await getFormByInstituteId(selectedInstitute.id)

        //  API-level failure (extra safety)
        if (!res.success) {
          toast.error(res.message || 'Failed to load form configuration')
          setFields([])
          return
        }

        const apiData = res.data

        // ⚠️ No form exists yet
        if (!apiData) {
          setFields([])
          toast.error('No form configuration found', )
          return
        }

        //  Convert + set fields
        const converted = convertApiToFieldConfig(
          apiData,
          selectedInstitute.id
        )

        setFields(converted)

        //  SUCCESS TOAST
        toast.success(res.message || 'Form loaded successfully')

      } catch (error: any) {
        console.error('Load form error:', error)

        //  ERROR TOAST (backend message)
        toast.error(error.message || 'Something went wrong while loading form')
        setFields([])
      }
    }

    loadConfig()
  }, [selectedInstitute])

  const validatePersonalMandatoryFields = () => {
    const personalDetailsFields = fields.filter(
      (f) =>
        f.fieldFor === 'Personal' &&
        f.sectionName === 'Personal Details'
    )

    const emailField = personalDetailsFields.find(
      (f) => f.fieldName === 'Email Address' && f.required
    )

    const contactField = personalDetailsFields.find(
      (f) => f.fieldName === 'Contact Number' && f.required
    )

    if (!emailField || !contactField) {
      return false
    }

    return true
  }


  /* ===============================
     Sections
  ================================ */
  const personalSections = [

    'Personal Details',
    'Parent Details',
    'Address Details',
    'Sibling Details',
  ]

  const educationSections = [
    '10th Details',
    '11th Details',
    '12th Details',
    'Diploma Details',
  ]

  /* ===============================
     Predefined Fields
  ================================ */
  const predefinedFields: Record<
    'Personal' | 'Education',
    Record<string, any[]>
  > = {
    Personal: {
      'Personal Details': [
        { fieldName: 'First Name', fieldType: 'text', required: true, maxLength: 50 },
        { fieldName: 'Last Name', fieldType: 'text', required: true, maxLength: 50 },
        { fieldName: 'Full Name', fieldType: 'text', required: true, maxLength: 100 },


        { fieldName: 'Date of Birth', fieldType: 'date', required: true },

        { fieldName: 'Place of Birth', fieldType: 'text', required: false, maxLength: 100 },

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
          options: ['OC', 'BC', 'BCM', 'MBC', 'DNC', 'SC', 'ST', 'SCA', 'Other'],
        },

        {
          fieldName: 'Religion',
          fieldType: 'select',
          required: false,
          options: ['Hindu', 'Christian', 'Muslim', 'Other'],
        },

        { fieldName: 'Caste', fieldType: 'text', required: false, maxLength: 50 },
        { fieldName: 'Community Certificate Number', fieldType: 'text', required: false, maxLength: 30 },
        { fieldName: 'Nationality', fieldType: 'text', required: true, maxLength: 50 },
        { fieldName: 'Contact Number', fieldType: 'number', required: true },
        { fieldName: 'Alternate Contact Number', fieldType: 'number', required: false },

        { fieldName: 'Email Address', fieldType: 'email', required: true, maxLength: 100 },
        { fieldName: 'Address', fieldType: 'textarea', required: true, maxLength: 200 },

        /*  STUDENT IMAGE */
        {
          fieldName: 'Student Image',
          fieldType: 'file',
          required: false,
        },

        /*  INSTITUTE BASED DETAILS */
        { fieldName: 'Aadhaar Number', fieldType: 'number', required: false },
        {
          fieldName: 'Blood Group',
          fieldType: 'select',
          required: false,
          options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
        },

        { fieldName: 'Hostel Required', fieldType: 'select', required: false, options: ['Yes', 'No'] },

        {
          fieldName: 'Mode of Transport',
          fieldType: 'select',
          required: false,
          options: ['College Bus', 'Own Vehicle', 'Public Transport']
        },
        {
          fieldName: 'Any relatives studied/studying in Sona Group of Institutions',
          fieldType: 'select',
          required: false,
          options: ['Yes', 'No'],
          defaultValue: 'No',
        },
      ],

      'Parent Details': [
        { fieldName: "Father Name", fieldType: "text", required: true, maxLength: 50 },
        { fieldName: "Father Age", fieldType: "number", required: false },
        { fieldName: "Father Mobile No", fieldType: "number", required: false, maxLength: 15 },
        { fieldName: "Father Occupation", fieldType: "text", required: false, maxLength: 50 },
        { fieldName: "Father Organization", fieldType: "text", required: false, maxLength: 50 },
        { fieldName: "Father Designation", fieldType: "text", required: false, maxLength: 50 },
        { fieldName: "Father Aadhar No", fieldType: "text", required: false, maxLength: 12 },
        { fieldName: "Father Blood Group", fieldType: "text", required: false, maxLength: 3 },

        { fieldName: "Mother Name", fieldType: "text", required: true, maxLength: 50 },
        { fieldName: "Mother Age", fieldType: "number", required: false },
        { fieldName: "Mother Mobile No", fieldType: "number", required: false, maxLength: 15 },
        { fieldName: "Mother Occupation", fieldType: "text", required: false, maxLength: 50 },
        { fieldName: "Mother Organization", fieldType: "text", required: false, maxLength: 50 },
        { fieldName: "Mother Designation", fieldType: "text", required: false, maxLength: 50 },
        { fieldName: "Mother Aadhar No", fieldType: "text", required: false, maxLength: 12 },
        { fieldName: "Mother Blood Group", fieldType: "text", required: false, maxLength: 3 },

        { fieldName: "Annual Income", fieldType: "number", required: false },
      ],

      'Address Details': [
        { fieldName: "Address", fieldType: "textarea", required: true, maxLength: 200 },
        { fieldName: "City", fieldType: "text", required: true, maxLength: 50 },
        { fieldName: "State", fieldType: "text", required: true, maxLength: 50 },
        { fieldName: "Country", fieldType: "text", required: true, maxLength: 50 },
        { fieldName: "Pincode", fieldType: "number", required: true, maxLength: 6 },
      ],



      'Sibling Details': [
        { fieldName: 'Sibling Count', fieldType: 'number', required: false, maxLength: 2 },
        { fieldName: 'Sibling Name', fieldType: 'text', required: false, maxLength: 50 },
        { fieldName: 'Sibling Age', fieldType: 'number', required: false },
        { fieldName: 'Sibling Studying', fieldType: 'select', required: false, options: ['Yes', 'No'] },
      ],
    },

    Education: {
      '10th Details': [
        { fieldName: '10th School Name', fieldType: 'text', required: true, maxLength: 100 },
        {
          fieldName: '10th Board',
          fieldType: 'select',
          required: true,
          options: ['State Board', 'CBSE', 'ICSE', 'Other'],
        },
        { fieldName: '10th Exam Roll No', fieldType: 'text', required: true, maxLength: 20 },
        { fieldName: 'School Place', fieldType: 'text', required: false, maxLength: 50 },

        { fieldName: 'English Marks', fieldType: 'number', required: true },
        { fieldName: 'Mathematics Marks', fieldType: 'number', required: true },
        { fieldName: 'Science Marks', fieldType: 'number', required: true },
        { fieldName: 'Social Science Marks', fieldType: 'number', required: true },
        { fieldName: '10th Language Marks', fieldType: 'number', required: false },

        { fieldName: '10th Total Marks', fieldType: 'number', required: true },
        { fieldName: '10th Maximum Marks', fieldType: 'number', required: true },
      ],

      '11th Details': [
        { fieldName: '11th Name of the School', fieldType: 'text', required: true, maxLength: 100 },
        {
          fieldName: '11th Board',
          fieldType: 'select',
          required: true,
          options: ['State Board', 'CBSE', 'ICSE', 'Other'],
        },
        { fieldName: '11th Exam Roll No', fieldType: 'text', required: true, maxLength: 20 },
        { fieldName: '11th Medium', fieldType: 'text', required: true, maxLength: 50 },
        { fieldName: '11th Year of Passing', fieldType: 'number', required: true },
        { fieldName: '11th Institution Place', fieldType: 'text', required: false, maxLength: 50 },
        { fieldName: '11th Total Marks', fieldType: 'number', required: true },
        { fieldName: '11th Maximum Marks', fieldType: 'number', required: true },
      ],

      '12th Details': [
        { fieldName: '12th Name of the School', fieldType: 'text', required: true, maxLength: 100 },
        {
          fieldName: '12th Board',
          fieldType: 'select',
          required: true,
          options: ['State Board', 'CBSE', 'ISC', 'Other'],
        },
        {
          fieldName: '12th Medium',
          fieldType: 'select',
          required: true,
          options: ['English', 'Tamil', 'Other'],
        },
        {
          fieldName: '12th Stream',
          fieldType: 'select',
          required: true,
          options: ['Science', 'Commerce', 'Arts', 'Vocational'],
        },
        { fieldName: '12th Exam Roll No', fieldType: 'text', required: true, maxLength: 20 },
        { fieldName: '12th Year of Passing', fieldType: 'number', required: true },
        { fieldName: '12th Institution Place', fieldType: 'text', required: false, maxLength: 50 },
        { fieldName: '12th Total Marks', fieldType: 'number', required: true },
        { fieldName: '12th Maximum Marks', fieldType: 'number', required: true },
        {
          fieldName: '12th Marks Type',
          fieldType: 'select',
          required: true,
          options: ['Percentage', 'CGPA'],
        },
        { fieldName: '12th Percentage / CGPA', fieldType: 'number', required: true },
        { fieldName: '12th Marksheet', fieldType: 'file', required: false },
      ],

      'Diploma Details': [
        { fieldName: 'Diploma College Name', fieldType: 'text', required: false, maxLength: 100 },
        { fieldName: 'Diploma Course', fieldType: 'text', required: false, maxLength: 50 },
        { fieldName: 'Diploma Specialization', fieldType: 'text', required: false, maxLength: 50 },
        { fieldName: 'Diploma Year of Completion', fieldType: 'number', required: false },
        { fieldName: 'Diploma Percentage / CGPA', fieldType: 'number', required: false },
        { fieldName: 'Diploma Certificate', fieldType: 'file', required: false },
      ],
    },

  }

  const convertApiToFieldConfig = (
    data: any,
    instituteId: string
  ): FieldConfig[] => {
    const result: FieldConfig[] = []

    const mapSection = (
      sections: any[],
      fieldFor: 'Personal' | 'Education'
    ) => {
      sections.forEach((section) => {
        section.fields.forEach((field: any) => {
          result.push({
            id: uid(),
            instituteId,
            fieldFor,
            sectionName: section.sectionName,
            fieldName: field.fieldName,
            fieldType: field.type,
            required: field.required ?? false,
            visibility: 'Yes',
            options: field.options ?? [],
            maxLength: field.maxLength,
          })
        })
      })
    }

    if (data.personalDetails) {
      mapSection(data.personalDetails, 'Personal')
    }

    if (data.educationDetails) {
      mapSection(data.educationDetails, 'Education')
    }

    return result
  }


  /* ===============================
     Load Institutes
  ================================ */
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

  /* ===============================
     Helpers
  ================================ */
  const resolvedSection =
    sectionName === 'custom' ? customSection.trim() : sectionName

  const fieldExists = (name: string) =>
    fields.some(
      (f) =>
        f.fieldFor === fieldFor &&
        f.sectionName === resolvedSection &&
        f.fieldName.toLowerCase() === name.toLowerCase()
    )

  /* ===============================
     Add Predefined Field
  ================================ */
  const handleAddPredefinedField = (value: string) => {
    if (!value) return

    if (value === 'custom') {
      setCustomMode(true)
      return
    }

    if (!resolvedSection)
      return toast.error('Select section')

    const list =
      predefinedFields[fieldFor]?.[resolvedSection] || []

    const field = list.find((f) => f.fieldName === value)
    if (!field) return

    if (fieldExists(value))
      return toast.error('Field already exists')

    setFields((prev) => [
      ...prev,
      {
        id: uid(),
        instituteId: selectedInstitute!.id,
        fieldFor,
        sectionName: resolvedSection,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        required: field.required,
        visibility: 'Yes',
        maxLength: field.maxLength ?? undefined,

        options: field.options || [],
      },
    ])

    toast.success('Field added')
  }




  /* ===============================
     Add Custom Field
  ================================ */
  const handleAddCustomField = () => {
    if (!fieldName || !fieldType)
      return toast.error('Field name & type required')

    if (!resolvedSection)
      return toast.error('Section required')

    if (
      ['select', 'checkbox', 'radiobutton'].includes(fieldType) &&
      !options.trim()
    )
      return toast.error('Options required')

    if (fieldExists(fieldName))
      return toast.error('Field already exists')

    setFields((prev) => [
      ...prev,
      {
        id: uid(),
        instituteId: selectedInstitute!.id,
        fieldFor,
        sectionName: resolvedSection,
        fieldName,
        fieldType,
        required,
        visibility: 'Yes',
        maxLength:
          ['text', 'number', 'email'].includes(fieldType) && maxLength
            ? maxLength
            : undefined,
        options:
          ['select', 'checkbox', 'radiobutton'].includes(fieldType)
            ? options.split(',').map((o) => o.trim())
            : [],
      },
    ])

    setFieldName('')
    setFieldType('')
    setMaxLength('')

    setOptions('')
    setRequired(false)
    setCustomMode(false)

    toast.success('Custom field added')
  }

  /* ===============================
     Submit
  ================================ */
  const handleSubmit = async () => {
    if (!selectedInstitute)
      return toast.error('Select institute')

    if (!validatePersonalMandatoryFields()) {
      toast.error(
        'Personal Details must include required Email Address and Contact Number'
      )
      return
    }

    const payload = {
      instituteId: selectedInstitute.id,

      personalDetails: buildSectionPayload(fields, 'Personal'),

      educationDetails: buildSectionPayload(fields, 'Education'),
    }

    await saveFormConfiguration(payload)
    toast.success('Saved successfully')
  }


  const handleDragEnd = (event: any, section: string) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setFields((prev) => {
      // clone array (IMPORTANT)
      const updated = [...prev]

      // only fields in THIS section + tab
      const sectionIndexes = updated
        .map((f, i) =>
          f.sectionName === section && f.fieldFor === previewTab ? i : -1
        )
        .filter((i) => i !== -1)

      const oldIndex = sectionIndexes.find(
        (i) => updated[i].id === active.id
      )
      const newIndex = sectionIndexes.find(
        (i) => updated[i].id === over.id
      )

      if (oldIndex === undefined || newIndex === undefined) return prev

      const [moved] = updated.splice(oldIndex, 1)
      updated.splice(newIndex, 0, moved)

      return updated
    })
  }



  /* ===============================
     Styles
  ================================ */
  const inputClass =
    'border rounded px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[#5667a8]'

  return (

    <div className="p-6">

      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Application settings
        </h1>
      </div>

      <BackButton />

      

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

      {selectedInstitute && (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* BUILDER */}
          <div className="border rounded flex flex-col">
            {/* HEADER */}
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-2 font-semibold rounded-t">
              Form Builder
            </div>

            {/* BODY */}
            <div className="p-4 space-y-6 flex-1 bg-white">

              {/* CATEGORY */}
              <div>
                <h1 className="text-sm font-semibold text-gray-700 mb-1">
                  Category
                </h1>
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

              {/* SECTION */}
              <div>
                <h1 className="text-sm font-semibold text-gray-700 mb-1">
                  Section
                </h1>
                <select
                  className={inputClass}
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                >
                  <option value="">Select Section</option>
                  {(fieldFor === 'Personal'
                    ? personalSections
                    : educationSections
                  ).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="custom">➕ Custom Section</option>
                </select>
              </div>

              {/* CUSTOM SECTION */}
              {sectionName === 'custom' && (
                <div>
                  <h1 className="text-sm font-semibold text-gray-700 mb-1">
                    Custom Section Name
                  </h1>
                  <input
                    className={inputClass}
                    placeholder="Enter custom section name"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                  />
                </div>
              )}

              {/* FIELD */}
              <div>
                <h1 className="text-sm font-semibold text-gray-700 mb-1">
                  Fields
                </h1>
                <select
                  className={inputClass}
                  onChange={(e) =>
                    handleAddPredefinedField(e.target.value)
                  }
                >
                  <option value="">Select Field</option>
                  {(predefinedFields[fieldFor]?.[resolvedSection] || []).map(
                    (f) => (
                      <option key={f.fieldName} value={f.fieldName}>
                        {f.fieldName}
                      </option>
                    )
                  )}
                  <option value="custom">➕ Custom Field</option>
                </select>
              </div>

              {/* CUSTOM FIELD */}
              {customMode && (
                <div className="border rounded p-3 space-y-3 bg-gray-50">
                  <h1 className="text-sm font-semibold text-gray-700">
                    Custom Field Details
                  </h1>

                  <input
                    className={inputClass}
                    placeholder="Field name"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                  />

                  {['text', 'number', 'email'].includes(fieldType) && (
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="Max length"
                      value={maxLength}
                      onChange={(e) =>
                        setMaxLength(e.target.value ? Number(e.target.value) : '')
                      }
                      min={1}
                    />
                  )}


                  <select
                    className={inputClass}
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                  >
                    <option value="">Select type</option>
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

                  {['select', 'checkbox', 'radiobutton'].includes(fieldType) && (
                    <input
                      className={inputClass}
                      placeholder="Options (comma separated)"
                      value={options}
                      onChange={(e) => setOptions(e.target.value)}
                    />
                  )}

                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={required}
                      onChange={(e) => setRequired(e.target.checked)}
                    />
                    Required
                  </label>

                  <button
                    onClick={handleAddCustomField}
                    className="bg-blue-600 text-white py-2 rounded w-full"
                  >
                    Add Field
                  </button>
                </div>
              )}

              {/* SAVE */}
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white py-2 rounded w-full"
              >
                Save
              </button>
            </div>
          </div>


          {/* PREVIEW */}
          {/* PREVIEW */}
          <div className="border rounded flex flex-col max-h-[65vh]">
            {/* HEADER */}
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-2 font-semibold rounded-t">
              Live Preview
            </div>

            {/* BODY */}
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">

              {/* TABS */}
              <div className="flex gap-3 mb-4">
                {(['Personal', 'Education'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPreviewTab(t)}
                    className={`px-4 py-2 rounded text-sm font-medium transition ${previewTab === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* SECTIONS */}
              {Array.from(
                new Set(
                  fields
                    .filter((f) => f.fieldFor === previewTab)
                    .map((f) => f.sectionName)
                )
              ).map((sec) => (
                <div key={sec} className="border bg-white p-3 rounded mb-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    {sec}
                  </h3>

                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, sec)}
                  >
                    <SortableContext
                      items={fields
                        .filter(
                          (f) =>
                            f.fieldFor === previewTab &&
                            f.sectionName === sec
                        )
                        .map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {fields
                        .filter(
                          (f) =>
                            f.fieldFor === previewTab &&
                            f.sectionName === sec
                        )
                        .map((f) => (
                          <SortableField
                            key={f.id}
                            field={f}
                            inputClass={inputClass}
                            onRemove={(id) =>
                              setFields((prev) =>
                                prev.filter((x) => x.id !== id)
                              )
                            }
                          />
                        ))}
                    </SortableContext>
                  </DndContext>
                </div>
              ))}

              {/* EMPTY STATE */}
              {fields.filter((f) => f.fieldFor === previewTab).length === 0 && (
                <p className="text-sm text-gray-500 text-center mt-10">
                  No fields added for {previewTab}
                </p>
              )}
            </div>
          </div>


        </div>
      )}
    </div>
  )
}
