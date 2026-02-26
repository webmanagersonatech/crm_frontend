"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, User, Calendar, Building2, Phone, BookOpen, Clock, FileText, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDuplicateLeads } from "@/app/lib/request/leadRequest";

interface Lead {
    _id?: string;
    leadId?: string;
    candidateName?: string;
    phoneNumber?: string;
    instituteId?: string;
    isduplicate?: boolean;
    program?: string;
    createdAt?: string;
    creator?: {
        firstname?: string;
        lastname?: string;
    };
    institute?: {
        name?: string;
    };
}

interface DuplicatePopupProps {
    open: boolean;
    onClose: () => void;
    duplicateReason?: string;
    leadId?: string;
    phoneNumber?: string;
    instituteId?: string;
}

export default function DuplicatePopup({
    open,
    onClose,
    duplicateReason,
    phoneNumber,
    instituteId,
}: DuplicatePopupProps) {
    const [loading, setLoading] = useState(false);
    const [originalData, setOriginalData] = useState<Lead[]>([]);
    const [duplicateData, setDuplicateData] = useState<Lead[]>([]);
    const [activeTab, setActiveTab] = useState<"original" | "duplicate">("original");

    useEffect(() => {
        if (open && phoneNumber) {
            fetchDuplicates();
        }
    }, [open]);

    const fetchDuplicates = async () => {
        try {
            setLoading(true);
            const data = await getDuplicateLeads(phoneNumber!, instituteId);
            setOriginalData(data.originalData || []);
            setDuplicateData(data.duplicateData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderLeadCard = (lead: Lead, isDuplicate = false) => {
        const bgColor = isDuplicate
            ? "bg-gradient-to-br from-red-50 to-orange-50/30 border-l-4 border-l-red-500"
            : "bg-gradient-to-br from-emerald-50 to-teal-50/30 border-l-4 border-l-emerald-500";

        return (
            <motion.div
                key={lead._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`${bgColor} rounded-xl p-4 sm:p-5 mb-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}
            >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 sm:p-2 rounded-lg ${isDuplicate ? 'bg-red-100' : 'bg-emerald-100'}`}>
                            {isDuplicate ? (
                                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                            ) : (
                                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                            )}
                        </div>
                        <div>
                            <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${isDuplicate
                                ? 'bg-red-200 text-red-700'
                                : 'bg-emerald-200 text-emerald-700'
                                }`}>
                                {isDuplicate ? 'Duplicate Entry' : 'Original Entry'}
                            </span>
                        </div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono bg-white/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-gray-600 self-start sm:self-auto">
                        ID: {lead.leadId || '-'}
                    </span>
                </div>

                {/* Mobile: Stacked layout, Tablet/Desktop: Grid layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-700 whitespace-nowrap">Name:</span>
                            <span className="text-gray-900 truncate">{lead.candidateName || '-'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-700 whitespace-nowrap">Program:</span>
                            <span className="text-gray-900 truncate">{lead.program || '-'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-700 whitespace-nowrap">Institute:</span>
                            <span className="text-gray-900 truncate">{lead.institute?.name || '-'}</span>
                        </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-700 whitespace-nowrap">Phone:</span>
                            <span className="text-gray-900 truncate">{lead.phoneNumber || '-'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-700 whitespace-nowrap">Created By:</span>
                            <span className="text-gray-900 truncate">
                                {lead.creator ? `${lead.creator.firstname} ${lead.creator.lastname}` : '-'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-700 whitespace-nowrap">Created:</span>
                            <span className="text-gray-900 truncate">{formatDate(lead.createdAt)}</span>
                        </div>
                    </div>
                </div>

                {isDuplicate && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-red-200 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-red-600">
                        <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                        <span className="truncate">This lead is marked as duplicate based on phone number</span>
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.3, bounce: 0.3 }}
                        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-full sm:max-w-2xl lg:max-w-3xl relative max-h-[95vh] sm:max-h-[90vh] overflow-hidden mx-2 sm:mx-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with gradient - Responsive padding */}
                        <div className="bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] px-4 sm:px-6 py-3 sm:py-5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm flex-shrink-0">
                                        <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white truncate">
                                            Duplicate Lead Detected
                                        </h2>
                                        <p className="text-white/80 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
                                            This lead appears to be a duplicate
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg flex-shrink-0"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Reason Banner - Responsive */}
                        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                                <div className="p-1 sm:p-1.5 bg-amber-100 rounded-lg mt-0.5 flex-shrink-0">
                                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-xs sm:text-sm font-medium text-amber-800">Duplicate Reason</span>
                                    <p className="text-xs sm:text-sm text-amber-700 mt-0.5 break-words">
                                        {duplicateReason || "Lead with same phone number already exists in the system"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs - Responsive, horizontal scroll on very small devices */}
                        <div className="px-4 sm:px-6 pt-3 sm:pt-4 border-b border-gray-200 overflow-x-auto">
                            <div className="flex gap-1 min-w-max sm:min-w-0">
                                <button
                                    onClick={() => setActiveTab("original")}
                                    className={`relative px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all rounded-t-lg ${activeTab === "original"
                                        ? "text-emerald-600 bg-emerald-50"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">Original</span>
                                        <span className="xs:hidden">Orig.</span>
                                        <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${activeTab === "original"
                                            ? "bg-emerald-200 text-emerald-800"
                                            : "bg-gray-200 text-gray-700"
                                            }`}>
                                            {originalData.length}
                                        </span>
                                    </div>
                                    {activeTab === "original" && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                                        />
                                    )}
                                </button>

                                <button
                                    onClick={() => setActiveTab("duplicate")}
                                    className={`relative px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all rounded-t-lg ${activeTab === "duplicate"
                                        ? "text-red-600 bg-red-50"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">Duplicate</span>
                                        <span className="xs:hidden">Dup.</span>
                                        <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${activeTab === "duplicate"
                                            ? "bg-red-200 text-red-800"
                                            : "bg-gray-200 text-gray-700"
                                            }`}>
                                            {duplicateData.length}
                                        </span>
                                    </div>
                                    {activeTab === "duplicate" && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"
                                        />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Content Area - Responsive height */}
                        <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                                    <div className="w-8 h-8 sm:w-12 sm:h-12 border-3 sm:border-4 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                                    <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">Loading lead details...</p>
                                </div>
                            ) : (
                                <>
                                    {activeTab === "original" && (
                                        <>
                                            {originalData.length === 0 ? (
                                                <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg sm:rounded-xl px-4">
                                                    <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                                                    <p className="text-sm sm:text-base text-gray-500 font-medium">No original records found</p>
                                                    <p className="text-xs sm:text-sm text-gray-400 mt-1">First entry with this phone number</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {originalData.map((lead) => renderLeadCard(lead))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {activeTab === "duplicate" && (
                                        <>
                                            {duplicateData.length === 0 ? (
                                                <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg sm:rounded-xl px-4">
                                                    <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                                                    <p className="text-sm sm:text-base text-gray-500 font-medium">No duplicate records found</p>
                                                    <p className="text-xs sm:text-sm text-gray-400 mt-1">All entries appear to be unique</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {duplicateData.map((lead) => renderLeadCard(lead, true))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer - Responsive */}
                        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 flex flex-col xs:flex-row gap-2 xs:gap-0 justify-between items-start xs:items-center">
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[150px] xs:max-w-none">
                                <span className="font-medium">Phone:</span> {phoneNumber || 'N/A'}
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full xs:w-auto px-4 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                            >
                                Close
                                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}