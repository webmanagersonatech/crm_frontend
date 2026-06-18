'use client'

import { useState, useEffect } from 'react'
import { toast } from "react-toastify";
import Select from 'react-select'
import { getActiveInstitutions } from '@/app/lib/request/institutionRequest'
import { 
  saveFeeConfiguration,
  getFeeConfigurationByInstitute,
  FeeConfiguration,
  CourseFeeStructure,
  Referral
} from '@/app/lib/request/feeconfigurationRoutes'
import {
  getSettingsByInstitute,
  saveSettings,
  Settings as SettingsType
} from '@/app/lib/request/settingRequest'

interface OptionType {
  value: string
  label: string
}

interface YearFee {
  year: string // "1st Year", "2nd Year", "3rd Year", "4th Year"
  amount: number
}

interface CourseFee {
  courseId: string
  courseName: string
  years: YearFee[]
}

interface ReferralType {
  name: string
  percentage: number
}

interface FeeStructure {
  instituteId: string
  instituteName: string
  logo: string
  courses: CourseFee[]
  referrals: ReferralType[]
}

export default function FeeStructurePage() {
  const [institutions, setInstitutions] = useState<OptionType[]>([])
  const [selectedInstitute, setSelectedInstitute] = useState<OptionType | null>(null)
  const [feeStructure, setFeeStructure] = useState<FeeStructure>({
    instituteId: '',
    instituteName: '',
    logo: '',
    courses: [],
    referrals: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [commonAmount, setCommonAmount] = useState<number | ''>('')
  const [institute, setInstitute] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Referral form state
  const [referralName, setReferralName] = useState('')
  const [referralPercentage, setReferralPercentage] = useState<number | ''>('')
  const [editingReferralIndex, setEditingReferralIndex] = useState<number | null>(null)

  const inputClass =
    'border rounded px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none'

  const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year']

  // Set mounted state
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Get user role and institute from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload = token.split(".")[1];
      const decoded: any = JSON.parse(atob(payload));

      setRole(decoded.role);

      if (decoded?.instituteId) {
        setInstitute(decoded.instituteId);
      }
    } catch {
      console.error("Token decode error");
    }
  }, []);

  // ------------------- Fetch institutions and handle auto-selection -------------------
  useEffect(() => {
    // Don't fetch if role is not set yet
    if (!role) return;

    const fetchInstitutions = async () => {
      try {
        setIsLoading(true);
        const res = await getActiveInstitutions();
        console.log('Fetched institutions:', res);

        if (res && res.length > 0) {
          const opts = res.map((inst: any) => ({
            value: inst.instituteId,
            label: inst.name
          }));
          setInstitutions(opts);

          // Auto-select institute for non-superadmin users
          if (role !== 'superadmin' && institute) {
            const foundInstitute = opts.find((inst:any)=> inst.value === institute);
            if (foundInstitute) {
              setSelectedInstitute(foundInstitute);
            } else {
              // Fallback: use institute ID as label if name not found
              setSelectedInstitute({
                value: institute,
                label: institute
              });
              toast.warning('Institute name not found, using ID as label');
            }
          }
        } else {
          toast.warning('No institutions found');
        }
      } catch (error) {
        console.error('Failed to fetch institutions:', error);
        toast.error('Failed to load institutions');
        
        // If superadmin, show error; if admin, try to set institute from token
        if (role !== 'superadmin' && institute) {
          setSelectedInstitute({
            value: institute,
            label: institute
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstitutions();
  }, [role, institute]);

  // ------------------- Fetch fee structure when institute selected -------------------
  useEffect(() => {
    if (!selectedInstitute) {
      setFeeStructure({
        instituteId: '',
        instituteName: '',
        logo: '',
        courses: [],
        referrals: []
      })
      setCommonAmount('')
      setIsDataLoaded(false)
      return
    }

    const fetchFeeStructure = async () => {
      try {
        setIsLoading(true)
        setIsDataLoaded(false)
        
        // First try to get from fee-configuration API
        let feeConfigData = null;
        try {
          feeConfigData = await getFeeConfigurationByInstitute(selectedInstitute.value);
          console.log('Fee configuration data:', feeConfigData);
        } catch (error) {
          // If not found, it's okay - we'll use settings data
          console.log('No fee configuration found, using settings data');
        }

        // Get settings data for courses
        const settingsData = await getSettingsByInstitute(selectedInstitute.value);
        console.log('Settings data:', settingsData);

        const totalYears = settingsData.courseYears || 0;

        const yearLabels = [
          '1st Year',
          '2nd Year',
          '3rd Year',
          '4th Year'
        ];

        // Build courses with fees from settings
        let coursesWithFees: CourseFee[] = [];
        
        if (settingsData.courses && settingsData.courses.length > 0) {
          // If we have fee config data, use those amounts
          const feeMap = new Map();
          if (feeConfigData?.courseFeeStructure) {
            feeConfigData.courseFeeStructure.forEach((feeCourse: any) => {
              const years = feeCourse.years || [];
              const yearMap = new Map();
              years.forEach((yearFee: any) => {
                yearMap.set(yearFee.year, yearFee.amount);
              });
              feeMap.set(feeCourse.courseId, yearMap);
            });
          }

          coursesWithFees = settingsData.courses.map((course: any) => {
            const courseFeeMap = feeMap.get(course.courseId);
            
            return {
              courseId: course.courseId || '',
              courseName: course.name || '',
              years: yearLabels.slice(0, totalYears).map((year) => ({
                year,
                amount: courseFeeMap?.get(year) || 0
              }))
            };
          });
        }

        // Build referrals
        let referrals: ReferralType[] = [];
        if (feeConfigData?.referrals && feeConfigData.referrals.length > 0) {
          referrals = feeConfigData.referrals.map((ref: any) => ({
            name: ref.name || '',
            percentage: ref.percentage || 0
          }));
        } else if (settingsData.referrals && settingsData.referrals.length > 0) {
          referrals = settingsData.referrals.map((ref: any) => ({
            name: ref.name || '',
            percentage: ref.percentage || 0
          }));
        }

        setFeeStructure({
          instituteId: selectedInstitute.value,
          instituteName: selectedInstitute.label,
          logo: settingsData.logo || '',
          courses: coursesWithFees,
          referrals: referrals
        })

        setCommonAmount('')
        setIsDataLoaded(true)

      } catch (error: any) {
        console.error('Failed to fetch fee structure:', error)
        toast.error(error.message || 'Failed to load fee structure')
        setIsDataLoaded(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchFeeStructure()
  }, [selectedInstitute])

  // ------------------- Course Fee Handlers -------------------
  const handleYearFeeChange = (courseId: string, yearIndex: number, amount: number) => {
    setFeeStructure(prev => ({
      ...prev,
      courses: prev.courses.map(course =>
        course.courseId === courseId
          ? {
            ...course,
            years: course.years.map((y, idx) =>
              idx === yearIndex ? { ...y, amount } : y
            )
          }
          : course
      )
    }))
  }

  const handleAddYear = (courseId: string) => {
    setFeeStructure(prev => ({
      ...prev,
      courses: prev.courses.map(course =>
        course.courseId === courseId
          ? {
            ...course,
            years: [...course.years, { year: `${course.years.length + 1}th Year`, amount: 0 }]
          }
          : course
      )
    }))
  }

  const handleRemoveYear = (courseId: string) => {
    setFeeStructure(prev => ({
      ...prev,
      courses: prev.courses.map(course =>
        course.courseId === courseId && course.years.length > 1
          ? {
            ...course,
            years: course.years.slice(0, -1)
          }
          : course
      )
    }))
  }

  // ------------------- Common Amount Handler -------------------
  const handleCommonAmountChange = (amount: number) => {
    setCommonAmount(amount)

    if (amount > 0) {
      setFeeStructure(prev => ({
        ...prev,
        courses: prev.courses.map(course => ({
          ...course,
          years: course.years.map(year => ({
            ...year,
            amount: amount
          }))
        }))
      }))
    } else {
      setFeeStructure(prev => ({
        ...prev,
        courses: prev.courses.map(course => ({
          ...course,
          years: course.years.map(year => ({
            ...year,
            amount: 0
          }))
        }))
      }))
    }
  }

  // ------------------- Referral Handlers -------------------
  const handleAddReferral = () => {
    const name = referralName.trim()
    const percentage = referralPercentage

    if (!name) {
      toast.error('Please enter referral name')
      return
    }

    if (percentage === '' || percentage < 0 || percentage > 100) {
      toast.error('Please enter a valid percentage (0-100)')
      return
    }

    if (feeStructure.referrals.some(ref => ref.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Referral name already exists')
      return
    }

    const newReferral: ReferralType = {
      name,
      percentage: percentage
    }

    setFeeStructure(prev => ({
      ...prev,
      referrals: [...prev.referrals, newReferral]
    }))

    setReferralName('')
    setReferralPercentage('')
    toast.success('Referral added successfully')
  }

  const handleUpdateReferral = () => {
    if (editingReferralIndex === null) return

    const name = referralName.trim()
    const percentage = referralPercentage

    if (!name) {
      toast.error('Please enter referral name')
      return
    }

    if (percentage === '' || percentage < 0 || percentage > 100) {
      toast.error('Please enter a valid percentage (0-100)')
      return
    }

    if (feeStructure.referrals.some((ref, idx) =>
      ref.name.toLowerCase() === name.toLowerCase() && idx !== editingReferralIndex
    )) {
      toast.error('Referral name already exists')
      return
    }

    setFeeStructure(prev => ({
      ...prev,
      referrals: prev.referrals.map((ref, idx) =>
        idx === editingReferralIndex
          ? { ...ref, name, percentage }
          : ref
      )
    }))

    setReferralName('')
    setReferralPercentage('')
    setEditingReferralIndex(null)
    toast.success('Referral updated successfully')
  }

  const handleEditReferral = (index: number) => {
    const referral = feeStructure.referrals[index]
    setReferralName(referral.name)
    setReferralPercentage(referral.percentage)
    setEditingReferralIndex(index)
  }

  const handleRemoveReferral = (index: number) => {
    setFeeStructure(prev => ({
      ...prev,
      referrals: prev.referrals.filter((_, idx) => idx !== index)
    }))
    if (editingReferralIndex === index) {
      setReferralName('')
      setReferralPercentage('')
      setEditingReferralIndex(null)
    }
  }

  const handleCancelReferralEdit = () => {
    setReferralName('')
    setReferralPercentage('')
    setEditingReferralIndex(null)
  }

  // ------------------- Save Fee Configuration -------------------
  const handleSaveAll = async () => {
    if (!selectedInstitute) {
      toast.error('Please select an institute')
      return
    }

    if (feeStructure.courses.length === 0) {
      toast.error('No courses available to save')
      return
    }

    // Validate all fees are set
    let hasError = false;
    for (const course of feeStructure.courses) {
      for (const year of course.years) {
        if (year.amount <= 0) {
          toast.error(`Please set fee for ${course.courseName} - ${year.year}`)
          hasError = true;
          break;
        }
      }
      if (hasError) break;
    }

    if (hasError) return;

    // Prepare payload for fee configuration API
    const feeConfigPayload: FeeConfiguration = {
      instituteId: selectedInstitute.value,
      courseFeeStructure: feeStructure.courses.map(c => ({
        courseId: c.courseId,
        name: c.courseName,
        years: c.years
      })),
      referrals: feeStructure.referrals
    }

    try {
      setIsLoading(true)
      
      // Save using the fee configuration API
      const result = await saveFeeConfiguration(feeConfigPayload);
      
      toast.success(result.message || 'Fee structure saved successfully!')
      setCommonAmount('')
      
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save fee structure')
    } finally {
      setIsLoading(false)
    }
  }

  // ------------------- Render -------------------
  // Check if user is superadmin
  const isSuperAdmin = role === 'superadmin';

  return (
    <div className="p-6 space-y-8 mx-auto">
      {/* ---------- Institute Selection ---------- */}
      {/* Only show institute selection for superadmin */}
      {isSuperAdmin && (
        <div className="border rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
            Institute Selection
          </div>
          <div className="p-6 bg-white">
            <div className="">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Select Institute <span className="text-red-500">*</span>
              </label>
              {isMounted ? (
                <Select
                  options={institutions}
                  value={selectedInstitute}
                  onChange={(selected) => {
                    console.log("Selected institute:", selected);
                    setSelectedInstitute(selected);
                  }}
                  placeholder={isLoading ? "Loading institutes..." : "Choose an institute..."}
                  isClearable
                  isDisabled={isLoading}
                  className="text-sm"
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                  }}
                  noOptionsMessage={() => (isLoading ? "Loading..." : "No institutes found")}
                />
              ) : (
                <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
              )}
              {institutions.length === 0 && !isLoading && (
                <p className="text-sm text-amber-600 mt-2">
                  No institutes available. Please add institutes first.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedInstitute && (
        <>
          {/* ---------- Institute Header ---------- */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
              Institute Details
            </div>
            <div className="p-6 bg-white">
              <div className="flex items-center space-x-6">
                {feeStructure.logo && (
                  <img
                    src={feeStructure.logo}
                    alt={feeStructure.instituteName}
                    className="w-24 h-24 rounded-lg border object-cover"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {feeStructure.instituteName}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Total Courses: {feeStructure.courses.length} |
                    Total Referrals: {feeStructure.referrals.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- Fee Structure ---------- */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
              Course Fee Structure
            </div>

            <div className="p-6 bg-white overflow-x-auto">
              {/* Common Amount Input */}
              {feeStructure.courses.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-4 flex-wrap">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Common Amount for All Years:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="w-48 border rounded px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter amount"
                    value={commonAmount}
                    onChange={(e) => handleCommonAmountChange(Number(e.target.value))}
                  />
                  <span className="text-xs text-gray-500">
                    This will auto-fill all course fees
                  </span>
                  {commonAmount !== '' && commonAmount > 0 && (
                    <button
                      onClick={() => {
                        setCommonAmount('')
                        handleCommonAmountChange(0)
                      }}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}

              {feeStructure.courses.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                            Course Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-[150px] bg-gray-50 z-10 min-w-[120px]">
                            Course ID
                          </th>
                          {feeStructure.courses[0]?.years.map((year, idx) => (
                            <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                              {year.year} Fee (₹)
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 min-w-[140px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {feeStructure.courses.map((course) => (
                          <tr key={course.courseId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap">
                              {course.courseName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 font-mono sticky left-[150px] bg-white z-10 whitespace-nowrap">
                              {course.courseId}
                            </td>
                            {course.years.map((year, yearIdx) => (
                              <td key={yearIdx} className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  className="w-32 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="Enter amount"
                                  value={year.amount || ''}
                                  onChange={(e) => {
                                    handleYearFeeChange(course.courseId, yearIdx, Number(e.target.value))
                                    if (commonAmount !== '') {
                                      setCommonAmount('')
                                    }
                                  }}
                                />
                              </td>
                            ))}
                            <td className="px-4 py-3 sticky right-0 bg-white z-10">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleAddYear(course.courseId)}
                                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 whitespace-nowrap"
                                  title="Add Year"
                                >
                                  + Year
                                </button>
                                {course.years.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveYear(course.courseId)}
                                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 whitespace-nowrap"
                                    title="Remove Last Year"
                                  >
                                    - Year
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-gray-400 p-2 text-center border-t">
                    <span>↔ Scroll horizontally to view all years</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No courses available. Please add courses in the settings first.
                </div>
              )}
            </div>
          </div>

          {/* ---------- Referral Management ---------- */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
              Referral Management
            </div>

            <div className="p-6 bg-white">
              {/* Add Referral Form */}
              <div className="flex flex-wrap items-end gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Referral Name
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Enter referral name"
                    value={referralName}
                    onChange={(e) => setReferralName(e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={inputClass}
                    placeholder="0-100"
                    value={referralPercentage}
                    onChange={(e) => setReferralPercentage(Number(e.target.value))}
                  />
                </div>
                <div className="flex gap-2">
                  {editingReferralIndex !== null ? (
                    <>
                      <button
                        onClick={handleUpdateReferral}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      >
                        Update
                      </button>
                      <button
                        onClick={handleCancelReferralEdit}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAddReferral}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      + Add Referral
                    </button>
                  )}
                </div>
              </div>

              {/* Referral List */}
              {feeStructure.referrals.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Referral Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commission (%)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {feeStructure.referrals.map((referral, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {referral.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {referral.percentage}%
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditReferral(index)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleRemoveReferral(index)}
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
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No referrals added yet. Add your first referral above.
                </div>
              )}
            </div>
          </div>

          {/* ---------- Save Button ---------- */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveAll}
              disabled={isLoading}
              className={`px-6 py-3 bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white text-sm rounded-lg hover:opacity-90 transition shadow-md font-semibold ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isLoading ? 'Saving...' : 'Save Fee Structure'}
            </button>
          </div>
        </>
      )}

      {!selectedInstitute && institutions.length > 0 && isSuperAdmin && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">
            Please select an institute to manage its fee structure
          </p>
          <p className="text-gray-400 text-sm mt-2">
            You can set year-wise fees and referral commissions
          </p>
        </div>
      )}

      {!selectedInstitute && institutions.length > 0 && !isSuperAdmin && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">
            Loading your institute details...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Please wait while we fetch your institute information
          </p>
        </div>
      )}

      {!selectedInstitute && institutions.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">
            No institutes available
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Please add institutes first before setting up fee structure
          </p>
        </div>
      )}
    </div>
  )
}