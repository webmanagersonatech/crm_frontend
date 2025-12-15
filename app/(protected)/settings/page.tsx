'use client'

import { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Select from 'react-select'
import { getActiveInstitutions } from '@/app/lib/request/institutionRequest'
import {

  getSettingsByInstitute,
  saveSettings,
  Settings as SettingsType
} from '@/app/lib/request/settingRequest'

interface OptionType {
  value: string
  label: string
}

interface PaymentData {
  authToken: string
  apiKey: string
  merchantId: string
}

export default function SettingsPage() {
  const [institutions, setInstitutions] = useState<OptionType[]>([])
  const [selectedInstitute, setSelectedInstitute] = useState<OptionType | null>(null)

  const [formData, setFormData] = useState({
    image: ''
  })
  const [courseInput, setCourseInput] = useState('')
  const [customCourses, setCustomCourses] = useState<string[]>([])

  const [paymentData, setPaymentData] = useState<PaymentData>({
    authToken: '',
    apiKey: '',
    merchantId: ''
  })

  const inputClass =
    'border rounded px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none'

  // ------------------- Fetch institutions -------------------
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const res = await getActiveInstitutions()
        const opts = res.map((inst: any) => ({
          value: inst.instituteId,
          label: inst.name
        }))
        setInstitutions(opts)
      } catch {
        toast.error('Failed to load institutions')
      }
    }
    fetchInstitutions()
  }, [])

  // ------------------- Fetch settings when institute selected -------------------
  useEffect(() => {
    if (!selectedInstitute) return

    const fetchSettings = async () => {
      try {
        const data = await getSettingsByInstitute(selectedInstitute.value)
        console.log('Fetched settings:', data)

        setFormData({ image: data.logo || '' })
        setCustomCourses(data.courses || [])
        setPaymentData({
          authToken: data.authToken || '',
          apiKey: data.apiKey || '',
          merchantId: data.merchantId || ''
        })
      } catch (error: any) {
        if (error.message.includes('Settings not found')) {
          setFormData({ image: '' })
          setCustomCourses([])
          setPaymentData({ authToken: '', apiKey: '', merchantId: '' })
          toast.error('No settings found. You can create new settings.')
        } else {
          toast.error(error.message)
        }
      }
    }

    fetchSettings()
  }, [selectedInstitute])

  // ------------------- Handlers -------------------
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, image: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleAddCourse = () => {
    if (!courseInput.trim()) {
      toast.error('Please enter a course name')
      return
    }
    if (customCourses.includes(courseInput.trim())) {
      toast.error('Course already added')
      return
    }

    setCustomCourses((prev) => [...prev, courseInput.trim()])
    setCourseInput('')
    toast.success('Course added')
  }

  const handleRemoveCourse = (index: number) => {
    setCustomCourses((prev) => prev.filter((_, i) => i !== index))
  }

  // ------------------- Save All Settings -------------------
  const handleSaveAll = async () => {
    if (!selectedInstitute) return toast.error('Please select an institute')
    if (!formData.image) return toast.error('Please upload an institute logo')
    if (customCourses.length === 0) return toast.error('Please add at least one course')
    if (!paymentData.authToken || !paymentData.apiKey || !paymentData.merchantId)
      return toast.error('Please fill all payment details')

    const payload: SettingsType = {
      instituteId: selectedInstitute.value,
      logo: formData.image,
      courses: customCourses,
      authToken: paymentData.authToken,
      apiKey: paymentData.apiKey,
      merchantId: paymentData.merchantId
    }

    try {
      const data = await saveSettings(payload)
      toast.success(data.message)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // ------------------- Render -------------------
  return (
    <div className="p-6 space-y-8">
      <Toaster position="top-right" />

      {/* ---------- General Settings ---------- */}
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8]
 text-white px-4 py-2 font-semibold">General Settings</div>

        <div className="p-4 md:p-6 bg-white grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Institute */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">
              Institute <span className="text-red-500">*</span>
            </label>
            <Select
              options={institutions}
              value={selectedInstitute}
              onChange={(selected) => setSelectedInstitute(selected)}
              placeholder="Select Institute"
              isClearable
              className="text-sm"
            />
          </div>

          {/* Logo */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">
              Logo <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
              {formData.image && (
                <img
                  src={formData.image}
                  alt="Logo"
                  className="w-20 h-20 rounded border object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="border border-gray-300 rounded p-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Courses */}
          <div className="flex flex-col col-span-1 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700 mb-1">
              Courses <span className="text-red-500">*</span>
            </label>

            {/* Input + Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0 mb-3">
              <input
                type="text"
                placeholder="Enter course name"
                className={`flex-1 ${inputClass}`}
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddCourse}
                className="px-4 py-2 bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors duration-150"
              >
                + Add
              </button>
            </div>

            {/* Display Added Courses */}
            {customCourses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {customCourses.map((course, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-gray-100 border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-700"
                  >
                    <span>{course}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCourse(index)}
                      className="ml-2 text-red-500 hover:text-red-700 font-semibold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No courses added yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Payment Settings ---------- */}
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-green-600 text-white px-4 py-2 font-semibold">Payment Settings</div>

        <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-4">
          {['authToken', 'apiKey', 'merchantId'].map((field, idx) => (
            <div key={idx} className="flex flex-col">
              <label className="text-sm font-semibold text-gray-600 mb-1 capitalize">
                {field === 'authToken'
                  ? 'Auth Token'
                  : field === 'apiKey'
                    ? 'API Key'
                    : 'Merchant ID'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                value={paymentData[field as keyof PaymentData]}
                onChange={(e) =>
                  setPaymentData((prev) => ({
                    ...prev,
                    [field]: e.target.value
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Save Button ---------- */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveAll}
          className="px-6 py-2 bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white text-sm rounded hover:bg-blue-700 transition"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}
