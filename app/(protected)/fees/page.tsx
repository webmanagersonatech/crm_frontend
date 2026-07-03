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
import { FaCreditCard, FaTimes } from 'react-icons/fa'

interface OptionType {
  value: string
  label: string
}

interface YearFee {
  year: string
  amount: number
  installments?: Installment[]
}

interface Installment {
  number: number
  amount: number
  dueDate: string
  isPaid?: boolean
}

interface CourseFee {
  courseId: string
  courseName: string
  years: YearFee[]
}

interface ReferralType {
  referralId: string
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

  // Installment popup state
  const [installmentPopup, setInstallmentPopup] = useState<{
    isOpen: boolean
    courseId: string
    yearIndex: number
    amount: number
    installments: Installment[]
  } | null>(null)

  const [installmentCount, setInstallmentCount] = useState<number>(2)
  const [installmentDueDates, setInstallmentDueDates] = useState<string[]>([])

  const inputClass =
    'border rounded px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none'

  // Helper function to format date for input
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return new Date().toISOString().split('T')[0];
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  // Helper function to generate referral ID
  const generateReferralId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Helper function to get year display
  const getYearDisplay = (year: string) => {
    const num = parseInt(year);
    if (num === 1) return '1st Year';
    if (num === 2) return '2nd Year';
    if (num === 3) return '3rd Year';
    if (num === 4) return '4th Year';
    return `${year}th Year`;
  }

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

  // Fetch institutions and handle auto-selection
  useEffect(() => {
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

          if (role !== 'superadmin' && institute) {
            const foundInstitute = opts.find((inst: any) => inst.value === institute);
            if (foundInstitute) {
              setSelectedInstitute(foundInstitute);
            } else {
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

  // Fetch fee structure when institute selected
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
        
        let feeConfigData = null;
        try {
          feeConfigData = await getFeeConfigurationByInstitute(selectedInstitute.value);
          console.log('Fee configuration data:', feeConfigData);
        } catch (error) {
          console.log('No fee configuration found, using settings data');
        }

        const settingsData = await getSettingsByInstitute(selectedInstitute.value);
        console.log('Settings data:', settingsData);

        const totalYears = settingsData.courseYears || 0;
        const yearLabels = Array.from({ length: totalYears }, (_, i) => String(i + 1));

        let coursesWithFees: CourseFee[] = [];
        
        if (settingsData.courses && settingsData.courses.length > 0) {
          const feeMap = new Map();
          if (feeConfigData?.courseFeeStructure) {
            feeConfigData.courseFeeStructure.forEach((feeCourse: any) => {
              const years = feeCourse.years || [];
              const yearMap = new Map();
              years.forEach((yearFee: any) => {
                const yearStr = String(yearFee.year);
                // Format installments dates for display
                const formattedInstallments = (yearFee.installments || []).map((inst: any) => ({
                  ...inst,
                  dueDate: formatDateForInput(inst.dueDate)
                }));
                yearMap.set(yearStr, {
                  amount: yearFee.amount,
                  installments: formattedInstallments
                });
              });
              feeMap.set(feeCourse.courseId, yearMap);
            });
          }

          coursesWithFees = settingsData.courses.map((course: any) => {
            const courseFeeMap = feeMap.get(course.courseId);
            
            return {
              courseId: course.courseId || '',
              courseName: course.name || '',
              years: yearLabels.map((year) => ({
                year: year,
                amount: courseFeeMap?.get(year)?.amount || 0,
                installments: courseFeeMap?.get(year)?.installments || []
              }))
            };
          });
        }

        let referrals: ReferralType[] = [];
        if (feeConfigData?.referrals && feeConfigData.referrals.length > 0) {
          referrals = feeConfigData.referrals.map((ref: any) => ({
            referralId: ref.referralId || generateReferralId(),
            name: ref.name || '',
            percentage: ref.percentage || 0
          }));
        } else if (settingsData.referrals && settingsData.referrals.length > 0) {
          referrals = settingsData.referrals.map((ref: any) => ({
            referralId: generateReferralId(),
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

  // Installment Popup Handlers
  const openInstallmentPopup = (courseId: string, yearIndex: number, amount: number) => {
    const course = feeStructure.courses.find(c => c.courseId === courseId);
    if (!course) return;

    const year = course.years[yearIndex];
    const existingInstallments = year.installments || [];
    
    // Format dates for display if there are existing installments
    const formattedInstallments = existingInstallments.length > 0 
      ? existingInstallments.map(inst => ({
          ...inst,
          dueDate: formatDateForInput(inst.dueDate)
        }))
      : Array(installmentCount).fill(null).map((_, index) => ({
          number: index + 1,
          amount: Math.round(amount / installmentCount),
          dueDate: new Date().toISOString().split('T')[0]
        }));

    const initialDueDates = formattedInstallments.map(inst => inst.dueDate);

    setInstallmentPopup({
      isOpen: true,
      courseId,
      yearIndex,
      amount,
      installments: formattedInstallments
    });
    
    setInstallmentCount(existingInstallments.length > 0 ? existingInstallments.length : 2);
    setInstallmentDueDates(initialDueDates);
  }

  const closeInstallmentPopup = () => {
    setInstallmentPopup(null);
    setInstallmentCount(2);
    setInstallmentDueDates([]);
  }

  const handleInstallmentCountChange = (count: number) => {
    if (!installmentPopup) return;
    
    setInstallmentCount(count);
    const amount = installmentPopup.amount;
    const equalAmount = Math.round(amount / count);
    
    // Preserve existing due dates if possible
    const existingDueDates = installmentPopup.installments.map(inst => inst.dueDate);
    
    const newInstallments: Installment[] = [];
    for (let i = 0; i < count; i++) {
      newInstallments.push({
        number: i + 1,
        amount: equalAmount,
        dueDate: existingDueDates[i] || new Date().toISOString().split('T')[0]
      });
    }
    
    setInstallmentPopup(prev => ({
      ...prev!,
      installments: newInstallments
    }));

    const newDueDates = newInstallments.map(inst => inst.dueDate);
    setInstallmentDueDates(newDueDates);
  }

  const handleInstallmentDueDateChange = (index: number, date: string) => {
    if (!installmentPopup) return;
    
    const updatedInstallments = [...installmentPopup.installments];
    updatedInstallments[index] = {
      ...updatedInstallments[index],
      dueDate: date
    };
    
    setInstallmentPopup(prev => ({
      ...prev!,
      installments: updatedInstallments
    }));

    const updatedDueDates = [...installmentDueDates];
    updatedDueDates[index] = date;
    setInstallmentDueDates(updatedDueDates);
  }

  const handleInstallmentAmountChange = (index: number, amount: number) => {
    if (!installmentPopup) return;
    
    const updatedInstallments = [...installmentPopup.installments];
    updatedInstallments[index] = {
      ...updatedInstallments[index],
      amount: amount
    };
    
    setInstallmentPopup(prev => ({
      ...prev!,
      installments: updatedInstallments
    }));
  }

  const saveInstallments = () => {
    if (!installmentPopup) return;
    
    const { courseId, yearIndex, installments } = installmentPopup;
    
    // Validate installments
    const totalInstallmentAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
    if (totalInstallmentAmount !== installmentPopup.amount) {
      toast.error(`Total installment amount (${totalInstallmentAmount}) must equal the total fee (${installmentPopup.amount})`);
      return;
    }

    // Validate due dates
    for (const inst of installments) {
      if (!inst.dueDate) {
        toast.error(`Please set due date for installment ${inst.number}`);
        return;
      }
    }

    setFeeStructure(prev => ({
      ...prev,
      courses: prev.courses.map(course => 
        course.courseId === courseId
          ? {
              ...course,
              years: course.years.map((year, idx) =>
                idx === yearIndex
                  ? { ...year, installments }
                  : year
              )
            }
          : course
      )
    }));

    toast.success('Installments saved successfully!');
    closeInstallmentPopup();
  }

  // Course Fee Handlers
  const handleYearFeeChange = (courseId: string, yearIndex: number, amount: number) => {
    setFeeStructure(prev => ({
      ...prev,
      courses: prev.courses.map(course =>
        course.courseId === courseId
          ? {
            ...course,
            years: course.years.map((y, idx) =>
              idx === yearIndex ? { ...y, amount, installments: [] } : y
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
            years: [
              ...course.years, 
              { 
                year: String(course.years.length + 1), 
                amount: 0, 
                installments: [] 
              }
            ]
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

  // Common Amount Handler
  const handleCommonAmountChange = (amount: number) => {
    setCommonAmount(amount)

    if (amount > 0) {
      setFeeStructure(prev => ({
        ...prev,
        courses: prev.courses.map(course => ({
          ...course,
          years: course.years.map(year => ({
            ...year,
            amount: amount,
            installments: []
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
            amount: 0,
            installments: []
          }))
        }))
      }))
    }
  }

  // Referral Handlers
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
      referralId: generateReferralId(),
      name,
      percentage: percentage
    }

    setFeeStructure(prev => ({
      ...prev,
      referrals: [...prev.referrals, newReferral]
    }))

    setReferralName('')
    setReferralPercentage('')
    toast.success('Referral added successfully with ID: ' + newReferral.referralId)
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
    toast.success('Referral removed successfully')
  }

  const handleCancelReferralEdit = () => {
    setReferralName('')
    setReferralPercentage('')
    setEditingReferralIndex(null)
  }

  // Save Fee Configuration
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
          toast.error(`Please set fee for ${course.courseName} - ${getYearDisplay(year.year)}`)
          hasError = true;
          break;
        }
      }
      if (hasError) break;
    }

    if (hasError) return;

    const feeConfigPayload: FeeConfiguration = {
      instituteId: selectedInstitute.value,
      courseFeeStructure: feeStructure.courses.map(c => ({
        courseId: c.courseId,
        name: c.courseName,
        years: c.years.map(year => ({
          year: year.year,
          amount: year.amount,
          installments: year.installments || []
        }))
      })),
      referrals: feeStructure.referrals
    }

    try {
      setIsLoading(true)
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

  // Installment Popup Component
  const InstallmentPopup = () => {
    if (!installmentPopup) return null;

    const totalAmount = installmentPopup.amount;
    const totalInstallmentAmount = installmentPopup.installments.reduce((sum, inst) => sum + inst.amount, 0);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Installment Setup</h2>
              <p className="text-sm opacity-90">Total Amount: ₹{totalAmount}</p>
            </div>
            <button
              onClick={closeInstallmentPopup}
              className="text-white hover:text-gray-200 transition"
            >
              <FaTimes size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Installment Count Selection */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Number of Installments
              </label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleInstallmentCountChange(num)}
                    className={`px-4 py-2 rounded-lg transition ${
                      installmentCount === num
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Installment Details */}
            <div className="space-y-4">
              {installmentPopup.installments.map((installment, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-700">
                    Installment {installment.number}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={installment.amount}
                        onChange={(e) => handleInstallmentAmountChange(index, Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={installment.dueDate || formatDateForInput(new Date().toISOString())}
                        onChange={(e) => handleInstallmentDueDateChange(index, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Installment Amount:</span>
              <span className={`font-bold text-lg ${totalInstallmentAmount === totalAmount ? 'text-green-600' : 'text-red-600'}`}>
                ₹{totalInstallmentAmount}
                {totalInstallmentAmount !== totalAmount && (
                  <span className="text-xs ml-2 font-normal text-red-500">
                    (Must equal ₹{totalAmount})
                  </span>
                )}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={closeInstallmentPopup}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveInstallments}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                disabled={totalInstallmentAmount !== totalAmount}
              >
                Save Installments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render
  const isSuperAdmin = role === 'superadmin';

  return (
    <div className="p-6 space-y-8 mx-auto">
      {/* Installment Popup */}
      <InstallmentPopup />

      {/* Institute Selection */}
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
          {/* Institute Header */}
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

          {/* Fee Structure */}
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
                            <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                              {getYearDisplay(year.year)} Fee (₹)
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
                                <div className="flex items-center gap-2">
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
                                  {year.amount > 0 && (
                                    <button
                                      onClick={() => openInstallmentPopup(course.courseId, yearIdx, year.amount)}
                                      className="text-blue-600 hover:text-blue-800 transition p-1"
                                      title="Set Installments"
                                    >
                                      <FaCreditCard size={18} />
                                      {year.installments && year.installments.length > 0 && (
                                        <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                          {year.installments.length}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </div>
                                {year.installments && year.installments.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {year.installments.length} installment(s)
                                  </div>
                                )}
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
                    <span>↔ Scroll horizontally to view all years | Click the credit card icon to set installments</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No courses available. Please add courses in the settings first.
                </div>
              )}
            </div>
          </div>

          {/* Referral Management */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold">
              Referral Management
            </div>

            <div className="p-6 bg-white">
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

              {feeStructure.referrals.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Referral ID
                        </th>
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
                          <td className="px-4 py-3 text-sm font-mono text-gray-500">
                            {referral.referralId}
                          </td>
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

          {/* Save Button */}
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