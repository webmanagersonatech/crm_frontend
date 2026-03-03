'use client'

import { useState, useEffect } from 'react'
import { toast } from "react-toastify";
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
type PaymentMethod = 'razorpay' | 'instamojo' | ''
export default function SettingsPage() {
  const [institutions, setInstitutions] = useState<OptionType[]>([])
  const [selectedInstitute, setSelectedInstitute] = useState<OptionType | null>(null)
  const [applicationFee, setApplicationFee] = useState<number | ''>('')
  const [applicantAge, setApplicantAge] = useState<number | ''>('')
  const [startYear, setStartYear] = useState<OptionType | null>(null)
  const [endYear, setEndYear] = useState<OptionType | null>(null)
  const [batchName, setBatchName] = useState('')
  const [isApplicationOpen, setIsApplicationOpen] = useState<boolean>(false)



  const [formData, setFormData] = useState({
    image: ''
  })
  const [courseInput, setCourseInput] = useState('')
  const [customCourses, setCustomCourses] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('')
  const [paymentData, setPaymentData] = useState({
    razorpay: {
      keyId: '',
      keySecret: ''
    },
    instamojo: {
      apiKey: '',
      authToken: ''
    }
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

        setFormData({ image: data.logo || '' })
        setCustomCourses(data.courses || [])
        setBatchName(data.batchName || '')
        setIsApplicationOpen(data.isApplicationOpen ?? false)
        setApplicationFee(data.applicationFee || '')
        setApplicantAge(data.applicantAge || '')

        if (data.academicYear) {
          const [start, end] = data.academicYear.split('-')
          setStartYear({ value: start, label: start })
          setEndYear({ value: end, label: end })
        }

        // ✅ Payment Handling
        if (data.paymentMethod) {
          setPaymentMethod(data.paymentMethod)

          if (data.paymentMethod === 'razorpay') {
            setPaymentData({
              razorpay: {
                keyId: data.paymentCredentials?.keyId || '',
                keySecret: data.paymentCredentials?.keySecret || ''
              },
              instamojo: {
                apiKey: '',
                authToken: ''
              }
            })
          }

          if (data.paymentMethod === 'instamojo') {
            setPaymentData({
              razorpay: {
                keyId: '',
                keySecret: ''
              },
              instamojo: {
                apiKey: data.paymentCredentials?.apiKey || '',
                authToken: data.paymentCredentials?.authToken || ''
              }
            })
          }
        }

      } catch (error: any) {
        toast.error(error.message)
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

  const START_YEAR = 2019
  const END_YEAR = 2060

  const startYearOptions: OptionType[] = Array.from(
    { length: END_YEAR - START_YEAR + 1 },
    (_, i) => {
      const year = START_YEAR + i
      return { value: year.toString(), label: year.toString() }
    }
  )

  const endYearOptions: OptionType[] = startYear
    ? Array.from(
      { length: END_YEAR - Number(startYear.value) },
      (_, i) => {
        const year = Number(startYear.value) + i + 1
        return { value: year.toString(), label: year.toString() }
      }
    )
    : []



  // ------------------- Save All Settings -------------------
  const handleSaveAll = async () => {
    if (!selectedInstitute) return toast.error('Please select an institute')
    if (!formData.image) return toast.error('Please upload an institute logo')
    if (applicationFee === '' || applicationFee < 0)
      return toast.error('Please enter valid application fee')

    if (applicantAge === '' || applicantAge < 1)
      return toast.error('Please enter valid applicant age')

    if (!startYear || !endYear)
      return toast.error('Please select application academic year')

    if (Number(endYear.value) <= Number(startYear.value))
      return toast.error('End year must be greater than start year')

    if (customCourses.length === 0)
      return toast.error('Please add at least one course')

    if (!paymentMethod)
      return toast.error('Please select payment method')

    if (paymentMethod === 'razorpay') {
      if (!paymentData.razorpay.keyId || !paymentData.razorpay.keySecret)
        return toast.error('Please fill Razorpay keys')
    }

    if (paymentMethod === 'instamojo') {
      if (!paymentData.instamojo.apiKey || !paymentData.instamojo.authToken)
        return toast.error('Please fill Instamojo keys')
    }

    const academicYear = `${startYear.value}-${endYear.value}`

    const payload: SettingsType = {
      instituteId: selectedInstitute.value,
      logo: formData.image,
      courses: customCourses,
      applicationFee,
      applicantAge,
      academicYear,
      batchName,
      isApplicationOpen,
      paymentMethod,
      paymentCredentials:
        paymentMethod === 'razorpay'
          ? paymentData.razorpay
          : paymentData.instamojo
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
          {/* Application Fee */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">
              Application Fee <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              className={inputClass}
              placeholder="Enter application fee"
              value={applicationFee}
              onChange={(e) => setApplicationFee(Number(e.target.value))}
            />
          </div>

          {/* Applicant Age */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">
              Applicant Age <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              className={inputClass}
              placeholder="Enter minimum applicant age"
              value={applicantAge}
              onChange={(e) => setApplicantAge(Number(e.target.value))}
            />
          </div>

          {/* Application Academic Year Start */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">
              Application Academic Year Start <span className="text-red-500">*</span>
            </label>
            <Select
              options={startYearOptions}
              value={startYear}
              onChange={(val) => {
                setStartYear(val)
                setEndYear(null) // reset end year when start changes
              }}
              placeholder="Select start year"
              className="text-sm"
            />
          </div>

          {/* Application Academic Year End */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">
              Application Academic Year End <span className="text-red-500">*</span>
            </label>
            <Select
              options={endYearOptions}
              value={endYear}
              onChange={(val) => setEndYear(val)}
              placeholder="Select end year"
              className="text-sm"
              isDisabled={!startYear}
            />
          </div>

          {/* Batch Name */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">
              Batch Name
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="Batch Name"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>

          {/* Application Open / Close */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">
              Application Status
            </label>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsApplicationOpen((prev) => !prev)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition
        ${isApplicationOpen ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow transform transition
          ${isApplicationOpen ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>

              <span className="text-sm font-medium">
                {isApplicationOpen ? 'Open' : 'Closed'}
              </span>
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
      {/* ---------- Payment Settings ---------- */}
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-green-600 text-white px-4 py-2 font-semibold">
          Payment Settings
        </div>

        <div className="p-4 bg-white space-y-6">

          {/* Payment Method Selection */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-2">
              Select Payment Method <span className="text-red-500">*</span>
            </label>

            <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                />
                <span>Razorpay</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="instamojo"
                  checked={paymentMethod === 'instamojo'}
                  onChange={() => setPaymentMethod('instamojo')}
                />
                <span>Instamojo</span>
              </label>
            </div>
          </div>

          {/* Razorpay Fields */}
          {paymentMethod === 'razorpay' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">
                  Razorpay Key ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={paymentData.razorpay.keyId}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      razorpay: {
                        ...prev.razorpay,
                        keyId: e.target.value
                      }
                    }))
                  }
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">
                  Razorpay Key Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={paymentData.razorpay.keySecret}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      razorpay: {
                        ...prev.razorpay,
                        keySecret: e.target.value
                      }
                    }))
                  }
                />
              </div>
            </div>
          )}

          {/* Instamojo Fields */}
          {paymentMethod === 'instamojo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">
                  Instamojo API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={paymentData.instamojo.apiKey}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      instamojo: {
                        ...prev.instamojo,
                        apiKey: e.target.value
                      }
                    }))
                  }
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">
                  Instamojo Auth Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={paymentData.instamojo.authToken}
                  onChange={(e) =>
                    setPaymentData((prev) => ({
                      ...prev,
                      instamojo: {
                        ...prev.instamojo,
                        authToken: e.target.value
                      }
                    }))
                  }
                />
              </div>
            </div>
          )}
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
