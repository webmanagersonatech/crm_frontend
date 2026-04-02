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

type CourseType = {
  name: string
  courseId: string
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
  const [gstPercentage, setGstPercentage] = useState<number | ''>('')

  const [formData, setFormData] = useState({
    image: ''
  })
  const [courseInput, setCourseInput] = useState('')
  const [courseIdInput, setCourseIdInput] = useState('')
  const [customCourses, setCustomCourses] = useState<CourseType[]>([])
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null)
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

  const isValidCourseId = (id: string) => {
    const regex = /^[A-Z0-9]{10}$/
    return regex.test(id)
  }

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


        const formattedCourses = (data.courses || []).map((course: any) => {
          if (typeof course === 'string') {
            return {
              name: course,
              courseId: ''
            }
          }
          return course
        })

        setCustomCourses(formattedCourses)
        setBatchName(data.batchName || '')
        setIsApplicationOpen(data.isApplicationOpen ?? false)
        setApplicationFee(data.applicationFee || '')
        setApplicantAge(data.applicantAge || '')
        setGstPercentage(data.gstPercentage || '')

        if (data.academicYear) {
          const [start, end] = data.academicYear.split('-')
          setStartYear({ value: start, label: start })
          setEndYear({ value: end, label: end })
        }

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
    const name = courseInput.trim()
    const id = courseIdInput.trim()

    if (!name) return toast.error('Please enter course name')
    if (!id) return toast.error('Please enter course ID')

    if (!isValidCourseId(id)) {
      return toast.error('Course ID must be 10 characters (A-Z, 0-9 only)')
    }

    const exists = customCourses.some(
      (c) => c.courseId === id
    )

    if (exists) {
      return toast.error('Course ID must be unique')
    }

    setCustomCourses((prev) => [...prev, { name, courseId: id }])
    setCourseInput('')
    setCourseIdInput('')
    setEditingCourseIndex(null)
    toast.success('Course added')
  }

  const handleUpdateCourse = () => {
    if (editingCourseIndex === null) return

    const name = courseInput.trim()
    const id = courseIdInput.trim()

    if (!name) return toast.error('Please enter course name')
    if (!id) return toast.error('Please enter course ID')

    if (!isValidCourseId(id)) {
      return toast.error('Course ID must be 10 characters (A-Z, 0-9 only)')
    }

    const exists = customCourses.some(
      (c, idx) => c.courseId === id && idx !== editingCourseIndex
    )

    if (exists) {
      return toast.error('Course ID must be unique')
    }

    const updatedCourses = [...customCourses]
    updatedCourses[editingCourseIndex] = { name, courseId: id }
    setCustomCourses(updatedCourses)
    setCourseInput('')
    setCourseIdInput('')
    setEditingCourseIndex(null)
    toast.success('Course updated')
  }

  const handleEditCourse = (index: number) => {
    const course = customCourses[index]
    setCourseInput(course.name)
    setCourseIdInput(course.courseId)
    setEditingCourseIndex(index)
  }

  const handleRemoveCourse = (index: number) => {
    setCustomCourses((prev) => prev.filter((_, i) => i !== index))
    if (editingCourseIndex === index) {
      setCourseInput('')
      setCourseIdInput('')
      setEditingCourseIndex(null)
    }
  }

  const handleCancelEdit = () => {
    setCourseInput('')
    setCourseIdInput('')
    setEditingCourseIndex(null)
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
    if (gstPercentage === '' || gstPercentage < 0)
      return toast.error('Please enter valid GST percentage')

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
      gstPercentage,
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
    <div className="p-6 space-y-8  mx-auto">
      {/* ---------- General Settings ---------- */}
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
          General Settings
        </div>

        <div className="p-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Institute */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">
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
              <label className="text-sm font-semibold text-gray-700 mb-2">
                Logo <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-4">
                {formData.image && (
                  <img
                    src={formData.image}
                    alt="Logo"
                    className="w-16 h-16 rounded border object-cover"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Application Fee */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">
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

            {/* GST Percentage */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">
                GST Percentage <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className={inputClass}
                placeholder="Enter GST %"
                value={gstPercentage}
                onChange={(e) => setGstPercentage(Number(e.target.value))}
              />
            </div>

            {/* Applicant Age */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">
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

            {/* Batch Name */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">
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

            {/* Application Academic Year Start */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">
                Academic Year Start <span className="text-red-500">*</span>
              </label>
              <Select
                options={startYearOptions}
                value={startYear}
                onChange={(val) => {
                  setStartYear(val)
                  setEndYear(null)
                }}
                placeholder="Select start year"
                className="text-sm"
              />
            </div>

            {/* Application Academic Year End */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">
                Academic Year End <span className="text-red-500">*</span>
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

            {/* Application Status */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">
                Application Status
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsApplicationOpen((prev) => !prev)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition ${isApplicationOpen ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow transform transition ${isApplicationOpen ? 'translate-x-6' : 'translate-x-0'
                      }`}
                  />
                </button>
                <span className="text-sm font-medium">
                  {isApplicationOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
          </div>

          {/* Courses Section */}
          <div className="mt-6">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Courses <span className="text-red-500">*</span>
            </label>

            {/* Input Form */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                placeholder="Enter course name"
                className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
              />
              <input
                type="text"
                placeholder="Enter Course ID (10 chars)"
                className="flex-1 border rounded px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                value={courseIdInput}
                onChange={(e) => setCourseIdInput(e.target.value.toUpperCase())}
                disabled={editingCourseIndex !== null}
                maxLength={10}
              />
              {editingCourseIndex !== null ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUpdateCourse}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddCourse}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  + Add Course
                </button>
              )}
            </div>

            {/* Course List */}
            {customCourses.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course ID
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customCourses.map((course, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {course.name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 font-mono">
                          {course.courseId}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditCourse(index)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveCourse(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Payment Settings ---------- */}
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
          Payment Settings
        </div>

        <div className="p-6 bg-white">
          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Select Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Razorpay</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="instamojo"
                  checked={paymentMethod === 'instamojo'}
                  onChange={() => setPaymentMethod('instamojo')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Instamojo</span>
              </label>
            </div>
          </div>

          {/* Razorpay Fields */}
          {paymentMethod === 'razorpay' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">
                  Razorpay Key ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Enter Key ID"
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
                <label className="text-sm font-semibold text-gray-700 mb-2">
                  Razorpay Key Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Enter Key Secret"
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
                <label className="text-sm font-semibold text-gray-700 mb-2">
                  Instamojo API Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Enter API Key"
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
                <label className="text-sm font-semibold text-gray-700 mb-2">
                  Instamojo Auth Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Enter Auth Token"
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
          className="px-6 py-2 bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white text-sm rounded hover:opacity-90 transition shadow-md"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}