'use client'

import { useState, useEffect } from 'react'
import { toast } from "react-toastify";
import Select from 'react-select'
import { getActiveInstitutions } from '@/app/lib/request/institutionRequest'
import {
    saveAdditionalFeeConfiguration,
    getAdditionalFeeConfigurationByInstitute,
    AdditionalFeeConfiguration,
} from '@/app/lib/request/additionalfeeconfiguration'

import {
    getSettingsByInstitute,
} from '@/app/lib/request/settingRequest'
import { FaBed, FaPlus, FaTrash, FaCalendarAlt } from 'react-icons/fa'

interface OptionType {
    value: string
    label: string
}

// ---- Room Type ----
interface RoomType {
    id: string
    name: string
    amount: number
    description?: string
}

// ---- Hostel Fee Structure ----
interface HostelFee {
    year: string
    dueDate?: string
    roomTypes: RoomType[]
}

interface HostelStructure {
    instituteId: string
    instituteName: string
    logo: string
    hostelFees: HostelFee[]
}

// Default room types to pre-populate
const DEFAULT_ROOM_TYPES = [
    { name: 'Common Room', amount: 0, description: 'Standard shared room' },
    { name: 'AC Attached', amount: 0, description: 'Air conditioned room' },
    { name: 'Single Room', amount: 0, description: 'Private single room' },
    { name: 'Deluxe Room', amount: 0, description: 'Premium deluxe room' },
]

export default function HostelFeeStructurePage() {
    const [institutions, setInstitutions] = useState<OptionType[]>([])
    const [selectedInstitute, setSelectedInstitute] = useState<OptionType | null>(null)
    const [hostelStructure, setHostelStructure] = useState<HostelStructure>({
        instituteId: '',
        instituteName: '',
        logo: '',
        hostelFees: []
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [institute, setInstitute] = useState<string>("");
    const [role, setRole] = useState<string | null>(null);

    // Helper function to get year display
    const getYearDisplay = (year: string) => {
        const num = parseInt(year);
        if (num === 1) return '1st Year';
        if (num === 2) return '2nd Year';
        if (num === 3) return '3rd Year';
        if (num === 4) return '4th Year';
        return `${year}th Year`;
    }

    // Generate room type ID: instituteId-random4digit
    const generateRoomTypeId = (instituteId: string): string => {
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${instituteId}-${random}`;
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

    // Fetch hostel fee structure when institute selected
    useEffect(() => {
        if (!selectedInstitute) {
            setHostelStructure({
                instituteId: '',
                instituteName: '',
                logo: '',
                hostelFees: []
            })
            return
        }

        const fetchHostelFeeStructure = async () => {
            try {
                setIsLoading(true)

                let feeConfigData = null;
                try {
                    feeConfigData = await getAdditionalFeeConfigurationByInstitute(selectedInstitute.value);
                } catch (error) {
                    console.log('No additional fee configuration found, using settings data');
                }

                const settingsData = await getSettingsByInstitute(selectedInstitute.value);

                const totalYears = settingsData.courseYears || 0;
                const yearLabels = Array.from({ length: totalYears }, (_, i) => String(i + 1));

                let hostelFees: HostelFee[] = [];

                // Try to get hostel fees from existing configuration
                if (feeConfigData?.hostelFeeStructure && feeConfigData.hostelFeeStructure.length > 0) {
                    hostelFees = feeConfigData.hostelFeeStructure.map((fee: any) => {
                        // Extract dueDate properly - handle both string and Date object
                        let dueDateValue = '';
                        if (fee.dueDate) {
                            const date = new Date(fee.dueDate);
                            if (!isNaN(date.getTime())) {
                                dueDateValue = date.toISOString().split('T')[0];
                            }
                        }
                        
                        return {
                            year: String(fee.year),
                            dueDate: dueDateValue,
                            roomTypes: fee.roomTypes?.map((rt: any) => ({
                                id: rt.id || generateRoomTypeId(selectedInstitute.value),
                                name: rt.name || '',
                                amount: rt.amount || 0,
                                description: rt.description || ''
                            })) || []
                        };
                    });
                } else {
                    // Initialize with default room types for each year
                    hostelFees = yearLabels.map((year) => ({
                        year,
                        dueDate: '',
                        roomTypes: DEFAULT_ROOM_TYPES.map(rt => ({
                            ...rt,
                            id: generateRoomTypeId(selectedInstitute.value)
                        }))
                    }));
                }

                setHostelStructure({
                    instituteId: selectedInstitute.value,
                    instituteName: selectedInstitute.label,
                    logo: settingsData.logo || '',
                    hostelFees: hostelFees
                })

            } catch (error: any) {
                console.error('Failed to fetch hostel fee structure:', error)
                toast.error(error.message || 'Failed to load hostel fee structure')
            } finally {
                setIsLoading(false)
            }
        }
        fetchHostelFeeStructure()
    }, [selectedInstitute])

    // Due Date Handler
    const handleDueDateChange = (yearIndex: number, dueDate: string) => {
        setHostelStructure(prev => ({
            ...prev,
            hostelFees: prev.hostelFees.map((year, idx) =>
                idx === yearIndex ? { ...year, dueDate } : year
            )
        }))
    }

    // Room Type Handlers
    const handleRoomTypeAmountChange = (yearIndex: number, roomTypeId: string, amount: number) => {
        setHostelStructure(prev => ({
            ...prev,
            hostelFees: prev.hostelFees.map((year, idx) =>
                idx === yearIndex ? {
                    ...year,
                    roomTypes: year.roomTypes.map(rt =>
                        rt.id === roomTypeId ? { ...rt, amount } : rt
                    )
                } : year
            )
        }))
    }

    const handleRoomTypeNameChange = (yearIndex: number, roomTypeId: string, name: string) => {
        setHostelStructure(prev => ({
            ...prev,
            hostelFees: prev.hostelFees.map((year, idx) =>
                idx === yearIndex ? {
                    ...year,
                    roomTypes: year.roomTypes.map(rt =>
                        rt.id === roomTypeId ? { ...rt, name } : rt
                    )
                } : year
            )
        }))
    }

    const handleRoomTypeDescriptionChange = (yearIndex: number, roomTypeId: string, description: string) => {
        setHostelStructure(prev => ({
            ...prev,
            hostelFees: prev.hostelFees.map((year, idx) =>
                idx === yearIndex ? {
                    ...year,
                    roomTypes: year.roomTypes.map(rt =>
                        rt.id === roomTypeId ? { ...rt, description } : rt
                    )
                } : year
            )
        }))
    }

    const handleAddRoomType = (yearIndex: number) => {
        const instituteId = hostelStructure.instituteId || selectedInstitute?.value || '';
        setHostelStructure(prev => ({
            ...prev,
            hostelFees: prev.hostelFees.map((year, idx) =>
                idx === yearIndex ? {
                    ...year,
                    roomTypes: [
                        ...year.roomTypes,
                        {
                            id: generateRoomTypeId(instituteId),
                            name: 'New Room Type',
                            amount: 0,
                            description: ''
                        }
                    ]
                } : year
            )
        }))
    }

    const handleRemoveRoomType = (yearIndex: number, roomTypeId: string) => {
        setHostelStructure(prev => ({
            ...prev,
            hostelFees: prev.hostelFees.map((year, idx) =>
                idx === yearIndex ? {
                    ...year,
                    roomTypes: year.roomTypes.filter(rt => rt.id !== roomTypeId)
                } : year
            )
        }))
    }

    // Year Handlers
    const handleAddYear = () => {
        const instituteId = hostelStructure.instituteId || selectedInstitute?.value || '';
        setHostelStructure(prev => ({
            ...prev,
            hostelFees: [
                ...prev.hostelFees,
                {
                    year: String(prev.hostelFees.length + 1),
                    dueDate: '',
                    roomTypes: DEFAULT_ROOM_TYPES.map(rt => ({
                        ...rt,
                        id: generateRoomTypeId(instituteId)
                    }))
                }
            ]
        }))
    }

    const handleRemoveYear = () => {
        setHostelStructure(prev => ({
            ...prev,
            hostelFees: prev.hostelFees.length > 1
                ? prev.hostelFees.slice(0, -1)
                : prev.hostelFees
        }))
    }

    // Save Hostel Fee Configuration
    const handleSaveAll = async () => {
        if (!selectedInstitute) {
            toast.error('Please select an institute')
            return
        }

        if (hostelStructure.hostelFees.length === 0) {
            toast.error('No hostel fee data available to save')
            return
        }

        let hasError = false;
        for (const fee of hostelStructure.hostelFees) {
            // Check if due date is set
            if (!fee.dueDate) {
                toast.error(`Please set due date for ${getYearDisplay(fee.year)}`)
                hasError = true;
                break;
            }

            for (const rt of fee.roomTypes) {
                if (rt.amount <= 0) {
                    toast.error(`Please set fee for ${rt.name} in ${getYearDisplay(fee.year)}`)
                    hasError = true;
                    break;
                }
                if (!rt.name.trim()) {
                    toast.error(`Please set name for room type in ${getYearDisplay(fee.year)}`)
                    hasError = true;
                    break;
                }
            }
            if (hasError) break;
        }

        if (hasError) return;

        const feeConfigPayload: AdditionalFeeConfiguration = {
            instituteId: selectedInstitute.value,
            hostelFeeStructure: hostelStructure.hostelFees.map(fee => ({
                year: fee.year,
                dueDate: fee.dueDate || '',
                roomTypes: fee.roomTypes.map(rt => ({
                    id: rt.id,
                    name: rt.name,
                    amount: rt.amount,
                    description: rt.description || ''
                }))
            }))
        }

        try {
            setIsLoading(true)
            const result = await saveAdditionalFeeConfiguration(feeConfigPayload);
            toast.success(result.message || 'Hostel fee structure saved successfully!')
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save hostel fee structure')
        } finally {
            setIsLoading(false)
        }
    }

    // Render
    const isSuperAdmin = role === 'superadmin';

    return (
        <div className="p-6 space-y-8 mx-auto">
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
                                {hostelStructure.logo && (
                                    <img
                                        src={hostelStructure.logo}
                                        alt={hostelStructure.instituteName}
                                        className="w-24 h-24 rounded-lg border object-cover"
                                    />
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {hostelStructure.instituteName}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                        <FaBed className="text-blue-600" />
                                        Hostel Fee Structure
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hostel Fee Structure */}
                    <div className="border rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white px-4 py-3 font-semibold flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FaBed className="text-white" />
                                Hostel Fee Structure by Year & Room Type
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddYear}
                                    className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition"
                                >
                                    + Add Year
                                </button>
                                {hostelStructure.hostelFees.length > 1 && (
                                    <button
                                        onClick={handleRemoveYear}
                                        className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition"
                                    >
                                        - Remove Last Year
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-white overflow-x-auto">
                            {hostelStructure.hostelFees.length > 0 ? (
                                <div className="space-y-6">
                                    {hostelStructure.hostelFees.map((fee, yearIndex) => (
                                        <div key={yearIndex} className="border rounded-lg overflow-hidden">
                                            <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-700 border-b flex items-center justify-between">
                                                <span>{getYearDisplay(fee.year)}</span>
                                                <button
                                                    onClick={() => handleAddRoomType(yearIndex)}
                                                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition flex items-center gap-1"
                                                >
                                                    <FaPlus size={10} /> Add Room Type
                                                </button>
                                            </div>
                                            <div className="p-4 bg-white border-b">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <FaCalendarAlt className="text-blue-600" />
                                                        <label className="text-sm font-medium text-gray-700">
                                                            Due Date:
                                                        </label>
                                                    </div>
                                                    <input
                                                        type="date"
                                                        className="border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={fee.dueDate || ''}
                                                        onChange={(e) => handleDueDateChange(yearIndex, e.target.value)}
                                                    />
                                                    <span className="text-xs text-gray-500">
                                                        (Set payment deadline for {getYearDisplay(fee.year)})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                                                                Room Type ID
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                                                Room Type
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                                                Fee (₹)
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">
                                                                Description
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                                                                Action
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {fee.roomTypes.map((rt) => (
                                                            <tr key={rt.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-2">
                                                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                        {rt.id}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        placeholder="Room type name"
                                                                        value={rt.name}
                                                                        onChange={(e) => handleRoomTypeNameChange(yearIndex, rt.id, e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="100"
                                                                        className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        placeholder="Amount"
                                                                        value={rt.amount || ''}
                                                                        onChange={(e) => {
                                                                            const val = Number(e.target.value);
                                                                            handleRoomTypeAmountChange(yearIndex, rt.id, val);
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                                        placeholder="Description"
                                                                        value={rt.description || ''}
                                                                        onChange={(e) => handleRoomTypeDescriptionChange(yearIndex, rt.id, e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <button
                                                                        onClick={() => handleRemoveRoomType(yearIndex, rt.id)}
                                                                        className="text-red-500 hover:text-red-700 transition"
                                                                        title="Remove Room Type"
                                                                    >
                                                                        <FaTrash size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No hostel fee structure available. Please add years to get started.
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
                            {isLoading ? 'Saving...' : 'Save Hostel Fee Structure'}
                        </button>
                    </div>
                </>
            )}

            {!selectedInstitute && institutions.length > 0 && isSuperAdmin && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">
                        Please select an institute to manage its hostel fee structure
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                        You can set different room types and fees for each year
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
                        Please add institutes first before setting up hostel fee structure
                    </p>
                </div>
            )}
        </div>
    )
}