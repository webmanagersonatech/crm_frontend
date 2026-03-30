"use client";
import { useState, useEffect } from "react";
import { FileDown, Users, ArrowRight, Loader2, Calendar, Settings, Search, ClipboardList } from "lucide-react";
import { toast } from "react-toastify";

import { DataTable } from "@/components/Tablecomponents";
import { getActivedata } from "@/app/lib/request/institutionRequest";
import { getFollowups, Followup, exportFollowups } from '@/app/lib/request/leadRequest';
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import Select from "react-select";

interface OptionType {
    value: string;
    label: string;
}

export default function LeadsPage() {
    // ------------------ STATE ------------------
    const [leads, setLeads] = useState<Followup[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(20);
    const [institutions, setInstitutions] = useState<OptionType[]>([]);
    const [selectedInstitution, setSelectedInstitution] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedCommunication, setSelectedCommunication] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [userpermission, setUserpermisssion] = useState<any | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean>(true);
    const [open, setOpen] = useState(false);

    const [userList, setUserList] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [role, setRole] = useState<string | null>(null);

    const [customizeOpen, setCustomizeOpen] = useState(false);

    const [phoneSearch, setPhoneSearch] = useState("");
    const [leadIdSearch, setLeadIdSearch] = useState("");
    const [totalEntries, setTotalEntries] = useState(0);
    const [selectedLeadSource, setSelectedLeadSource] = useState("all");

    const [activeFilter, setActiveFilter] = useState<string[]>([]);

    const [exportData, setExportData] = useState<any[]>([]);
    const [exportLoading, setExportLoading] = useState(false);

    const filterOptions = [
        ...(userpermission === "superadmin"
            ? [{ value: "institution", label: "Institution" }] : []),
        { value: "user", label: "User" },
        { value: "status", label: "Status" },
        { value: "communication", label: "Communication" },
        { value: "name", label: "Candidate Name" },
        { value: "phone", label: "Phone" },
        { value: "leadId", label: "Lead ID" },
        { value: "date", label: "Date Range" },
    ];

    const resetFilterState = (filter: string) => {
        switch (filter) {
            case "date":
                setStartDate("");
                setEndDate("");
                break;
            case "institution":
                setSelectedInstitution("all");
                break;
            case "user":
                setSelectedUserId("");
                break;
            case "leadSource":
                setSelectedLeadSource("all");
                break;
            case "status":
                setSelectedStatus("all");
                break;
            case "communication":
                setSelectedCommunication("all");
                break;
            case "name":
                setSearchTerm("");
                break;
            case "phone":
                setPhoneSearch("");
                break;
            case "leadId":
                setLeadIdSearch("");
                break;
        }
    };

    const [columnVisibility, setColumnVisibility] = useState({
        leadId: true,
        instituteId: true,
        candidateName: true,
        program: true,
        phoneNumber: true,
        status: true,
        calltaken: true,
        followUpDate: true,
        communication: true,
        counsellorName: true,
        description: true,
        followUp: true,
        createdAt: true,
        createdBy: true
    });

    // ------------------ OPTIONS ------------------
    const columnOptions = [
        { key: "leadId", label: "Lead ID" },
        ...(userpermission === "superadmin"
            ? [{ key: "instituteId", label: "Institute" }]
            : []),
        { key: "candidateName", label: "Candidate" },
        { key: "program", label: "Program" },
        { key: "phoneNumber", label: "Phone" },
        { key: "communication", label: "Communication" },
        { key: "followUpDate", label: "Follow Up Date" },
        { key: "calltaken", label: "Call taken by" },
        { key: "counsellorName", label: "Counsellor" },     // ✅ added
        { key: "description", label: "Description" },       // ✅ added
        { key: "createdAt", label: "Created At" },
        { key: "status", label: "Status" },

    ];

    const statusOptions: OptionType[] = [
        { value: "New", label: "New" },
        { value: "Followup", label: "Followup" },
        { value: "Not Reachable", label: "Not Reachable" },
        { value: "Switched Off", label: "Switched Off" },
        { value: "Not Picked", label: "Not Picked" },
        { value: "Irrelevant", label: "Irrelevant" },
        { value: "Interested", label: "Interested" },
        { value: "Not Interested", label: "Not Interested" },
        { value: "Cut the call", label: "Cut the call" },
        { value: "Admitted", label: "Admitted" },
        { value: "Closed", label: "Closed" },
    ];

    const communicationOptions: OptionType[] = [
        { value: "WhatsApp", label: "WhatsApp" },
        { value: "Offline", label: "Offline" },
        { value: "Online", label: "Online" },
        { value: "Phone", label: "Phone" },
        { value: "Social Media", label: "Social Media" },
    ];

    // ------------------ EFFECTS ------------------
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const payload = token.split(".")[1];
            const decoded: any = JSON.parse(atob(payload));
            setRole(decoded.role);
        } catch {
            console.error("Token decode error");
        }
    }, []);

    useEffect(() => {
        const fetchActiveData = async () => {
            try {
                const data = await getActivedata(
                    selectedInstitution !== "all" ? selectedInstitution : undefined
                );
                setUserList(data.users || []);
                setInstitutions(
                    (data.institutions || []).map((inst: any) => ({
                        value: inst.instituteId,
                        label: inst.name,
                    }))
                );
            } catch (error: any) {
                console.error("Failed to fetch active data:", error.message);
            }
        };

        fetchActiveData();
    }, [selectedInstitution]);

    useEffect(() => {
        const fetchPermissions = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                console.log("No token found, skipping API call");
                setHasPermission(false);
                return;
            }

            try {
                const payload = token.split(".")[1];
                const decoded: any = JSON.parse(atob(payload));

                if ((decoded.role === "admin" || decoded.role === "user") && decoded.instituteId && decoded.id) {
                    const data = await getaccesscontrol({
                        userId: decoded.id,
                        instituteId: decoded.instituteId
                    });
                    const leadPermission = data.permissions?.find(
                        (p: any) => p.moduleName === "Lead Manager"
                    );
                    if (
                        leadPermission &&
                        (leadPermission.view ||
                            leadPermission.create ||
                            leadPermission.edit ||
                            leadPermission.delete ||
                            leadPermission.filter ||
                            leadPermission.download)
                    ) {
                        setUserpermisssion(leadPermission);
                        setHasPermission(true);
                    } else {
                        setUserpermisssion(null);
                        setHasPermission(false);
                    }
                } else if (decoded.role === "superadmin") {
                    setUserpermisssion("superadmin");
                    setHasPermission(true);
                } else {
                    setHasPermission(false);
                }
            } catch (error) {
                console.error("Failed to decode token or fetch permissions:", error);
                setHasPermission(false);
            }
        };

        fetchPermissions();
    }, []);

    const fetchFollowups = async () => {
        setLoading(true);
        try {
            const response = await getFollowups({
                page: currentPage,
                limit: limit,
                instituteId: selectedInstitution !== "all" ? selectedInstitution : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                status: selectedStatus !== "all" ? selectedStatus : undefined,
                candidateName: searchTerm || undefined,
                phoneNumber: phoneSearch || undefined,
                userId: selectedUserId || undefined,
                leadId: leadIdSearch || undefined,
                communication: selectedCommunication !== "all" ? selectedCommunication : undefined,
            });

            setLeads(response.data);
            setTotalEntries(response.pagination.total);
            setTotalPages(response.pagination.totalPages);
        } catch (error) {
            console.error('Error fetching followups:', error);
            toast.error("Failed to fetch leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFollowups();
    }, [currentPage, selectedInstitution, limit, startDate, endDate, selectedUserId, phoneSearch, leadIdSearch, selectedStatus, selectedCommunication, searchTerm]);

    const handleExport = async () => {
        try {
            setExportLoading(true);

            const exportResult = await exportFollowups({
                instituteId: selectedInstitution !== "all" ? selectedInstitution : undefined,
                status: selectedStatus !== "all" ? selectedStatus : undefined,
                communication: selectedCommunication !== "all" ? selectedCommunication : undefined,
                candidateName: searchTerm || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                userId: selectedUserId || undefined,
                phoneNumber: phoneSearch || undefined,
                leadId: leadIdSearch || undefined,
            });

            if (!exportResult.data || exportResult.data.length === 0) {
                toast.info("No data to export");
                return;
            }

            const transformedData = exportResult.data.map((lead: any) => {
                const obj: any = {};

                // ✅ Lead ID
                if (columnVisibility.leadId) {
                    obj["Lead ID"] = lead.leadId || "-";
                }

                // ✅ Institute (fixed field)
                if (userpermission === "superadmin" && columnVisibility.instituteId) {
                    obj["Institute"] = lead.instituteName || lead.instituteId || "-";
                }

                // ✅ Candidate
                if (columnVisibility.candidateName) {
                    obj["Candidate Name"] = lead.candidateName || "-";
                }

                // ✅ Program
                if (columnVisibility.program) {
                    obj["Program"] = lead.program || "-";
                }

                // ✅ Phone
                if (columnVisibility.phoneNumber) {
                    obj["Phone"] = lead.phoneNumber || "-";
                }

                // ✅ Status
                if (columnVisibility.status) {
                    obj["Status"] = lead.status || "-";
                }

                // ✅ Call Taken By
                if (columnVisibility.calltaken) {
                    obj["Call Taken By"] = lead.calltaken || "-";
                }

                // ✅ Follow Up Date (FIXED key mismatch)
                if (columnVisibility.followUpDate) {
                    obj["Follow Up Date"] = lead.followUpDate
                        ? new Date(lead.followUpDate).toLocaleString()
                        : "-";
                }

                // ✅ Communication
                if (columnVisibility.communication) {
                    obj["Communication"] = lead.communication || "-";
                }

                // ✅ Counsellor
                if (columnVisibility.counsellorName) {
                    obj["Counsellor"] = lead.counsellorName || "-";
                }

                // ✅ Description
                if (columnVisibility.description) {
                    obj["Description"] = lead.description || "-";
                }

                // ✅ Created At
                if (columnVisibility.createdAt) {
                    obj["Created At"] = lead.createdAt
                        ? new Date(lead.createdAt).toLocaleString()
                        : "-";
                }


                return obj;
            });

            setExportData(transformedData);
            setOpen(true);

        } catch (error: any) {
            toast.error("Failed to export leads: " + (error.message || "Unknown error"));
            console.error("Error exporting leads:", error);
        } finally {
            setExportLoading(false);
        }
    };

    // ------------------ COLUMNS ------------------
    const columns = [
        columnVisibility.leadId && {
            header: "Lead ID",
            render: (o: Followup) => o.leadId || "—",
        },
        ...(userpermission === "superadmin" && columnVisibility.instituteId
            ? [{
                header: "Institute",
                render: (o: any) => o.instituteName || "—",
            }]
            : []),
        columnVisibility.candidateName && {
            header: "Candidate Name",
            render: (o: Followup) => o.candidateName || "—",
        },
        columnVisibility.program && {
            header: "Program",
            render: (o: Followup) => o.program || "—",
        },
        columnVisibility.phoneNumber && {
            header: "Phone",
            render: (o: Followup) => o.phoneNumber || "—",
        },
        columnVisibility.status && {
            header: "Status",
            render: (o: Followup) => {
                const statusColorMap: Record<string, string> = {
                    New: "bg-gray-100 text-gray-700 border border-gray-400",
                    Followup: "bg-blue-100 text-blue-700 border border-blue-400",
                    "Not Reachable": "bg-yellow-100 text-yellow-700 border border-yellow-400",
                    "Switched Off": "bg-orange-100 text-orange-700 border border-orange-400",
                    "Not Picked": "bg-amber-100 text-amber-700 border border-amber-400",
                    Irrelevant: "bg-purple-100 text-purple-700 border border-purple-400",
                    Interested: "bg-green-100 text-green-700 border border-green-400",
                    "Not Interested": "bg-red-100 text-red-700 border border-red-400",
                    "Cut the call": "bg-pink-100 text-pink-700 border border-pink-400",
                    Admitted: "bg-emerald-100 text-emerald-700 border border-emerald-400",
                    Closed: "bg-indigo-100 text-indigo-700 border border-indigo-400",
                };

                const colorClass = statusColorMap[o.status] || "bg-gray-100 text-gray-700 border border-gray-400";

                return (
                    <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium inline-block min-w-[90px] text-center ${colorClass}`}
                    >
                        {o.status || "Unknown"}
                    </span>
                );
            },
        },
        columnVisibility.calltaken && {
            header: "Call Taken By",
            render: (o: Followup) => o.calltaken || "—",
        },
        columnVisibility.followUpDate && {
            header: "Follow Up Date",
            render: (o: Followup) => {
                const date = new Date(o.followUpDate);
                return (
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{date.toLocaleDateString()}</span>
                    </div>
                );
            },
        },
        columnVisibility.communication && {
            header: "Communication",
            render: (o: Followup) => {
                const commColors: Record<string, string> = {
                    'WhatsApp': 'bg-green-100 text-green-800',
                    'Offline': 'bg-purple-100 text-purple-800',
                    'Online': 'bg-cyan-100 text-cyan-800',
                    'Phone': 'bg-indigo-100 text-indigo-800',
                    'Social Media': 'bg-pink-100 text-pink-800'
                };
                const colorClass = commColors[o.communication] || 'bg-gray-100 text-gray-800';

                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                        {o.communication}
                    </span>
                );
            },
        },
        columnVisibility.counsellorName && {
            header: "Counsellor",
            render: (o: Followup) => o.counsellorName || "—",
        },
        columnVisibility.description && {
            header: "Description",
            render: (o: Followup) => {
                const desc = o.description || "—";
                return desc !== "—" ? (
                    <div className="max-w-xs truncate" title={desc}>
                        {desc}
                    </div>
                ) : "—";
            },
        },
        columnVisibility.createdAt && {
            header: "Created At",
            render: (o: Followup) => new Date(o.createdAt).toLocaleDateString(),
        },
    ].filter(Boolean) as any[];

    if (!hasPermission) {
        return (
            <div className="p-6 text-center text-red-600">
                You do not have permission to access this page. Please contact your superadmin.
            </div>
        );
    }

    // ------------------ RENDER ------------------
    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-semibold">Leads Followups report</h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                    {/* Left side - Entries selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Show</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e2a5a] dark:focus:ring-[#3d4f91] cursor-pointer"
                        >
                            {[20, 50, 100, 250, 500].map((value) => (
                                <option key={value} value={value} className="text-xs">
                                    {value}
                                </option>
                            ))}
                        </select>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">entries</span>
                    </div>

                    {/* Right side - All filters and actions */}
                    <div className="flex-1 flex flex-wrap items-center gap-3 justify-end">
                        {(userpermission === "superadmin" || userpermission?.filter) && (
                            <>
                                {/* Customize Columns Button */}
                                <button
                                    onClick={() => setCustomizeOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    <span>Customize</span>
                                </button>

                                {/* Filter Selector */}
                                <div className="min-w-[180px]">
                                    <Select
                                        placeholder="Add Filters"
                                        options={filterOptions}
                                        isMulti
                                        closeMenuOnSelect={false}
                                        value={filterOptions.filter(opt => activeFilter.includes(opt.value))}
                                        onChange={(selectedOptions) => {
                                            const values = selectedOptions?.map(opt => opt.value) || [];
                                            const removedFilters = activeFilter.filter(f => !values.includes(f));
                                            removedFilters.forEach((filter) => resetFilterState(filter));
                                            setActiveFilter(values);
                                        }}
                                        className="text-sm"
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                minHeight: '36px',
                                                borderColor: '#e5e7eb',
                                                boxShadow: 'none',
                                                '&:hover': { borderColor: '#d1d5db' }
                                            })
                                        }}
                                    />
                                </div>

                                {/* Dynamic Filters Section */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Date Range Filter */}
                                    {activeFilter.includes("date") && (
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-md border border-gray-100 dark:border-gray-800">
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480]"
                                            />
                                            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480]"
                                            />
                                        </div>
                                    )}

                                    {/* Institution Filter */}
                                    {activeFilter.includes("institution") && userpermission === "superadmin" && (
                                        <select
                                            value={selectedInstitution}
                                            onChange={(e) => setSelectedInstitution(e.target.value)}
                                            className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480] bg-white dark:bg-gray-800 min-w-[140px]"
                                        >
                                            <option value="all">All Institutions</option>
                                            {institutions.map((inst) => (
                                                <option key={inst.value} value={inst.value}>{inst.label}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* User Filter */}
                                    {activeFilter.includes("user") && role !== "user" && (
                                        <select
                                            value={selectedUserId}
                                            onChange={(e) => setSelectedUserId(e.target.value)}
                                            className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480] bg-white dark:bg-gray-800 min-w-[140px]"
                                        >
                                            <option value="">Select User</option>
                                            {userList.map((user) => (
                                                <option key={user._id} value={user._id}>
                                                    {user.firstname} {user.lastname}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Status Filter */}
                                    {activeFilter.includes("status") && (
                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480] bg-white dark:bg-gray-800 min-w-[140px]"
                                        >
                                            <option value="all">All Status</option>
                                            {statusOptions.map((s) => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Communication Filter */}
                                    {activeFilter.includes("communication") && (
                                        <select
                                            value={selectedCommunication}
                                            onChange={(e) => setSelectedCommunication(e.target.value)}
                                            className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480] bg-white dark:bg-gray-800 min-w-[140px]"
                                        >
                                            <option value="all">All Communication</option>
                                            {communicationOptions.map((c) => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Search Inputs */}
                                    {activeFilter.includes("name") && (
                                        <div className="relative min-w-[200px]">
                                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by name..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480]"
                                            />
                                        </div>
                                    )}

                                    {activeFilter.includes("phone") && (
                                        <div className="relative min-w-[160px]">
                                            <input
                                                type="text"
                                                placeholder="Search by phone..."
                                                value={phoneSearch}
                                                onChange={(e) => setPhoneSearch(e.target.value)}
                                                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480]"
                                            />
                                        </div>
                                    )}

                                    {activeFilter.includes("leadId") && (
                                        <div className="relative min-w-[160px]">
                                            <input
                                                type="text"
                                                placeholder="Search by Lead ID..."
                                                value={leadIdSearch}
                                                onChange={(e) => setLeadIdSearch(e.target.value)}
                                                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480]"
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            {/* Export Button */}
                            {(userpermission === "superadmin" || userpermission?.download) && (
                                <button
                                    onClick={handleExport}
                                    disabled={exportLoading}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all shadow-sm ${exportLoading
                                        ? 'bg-green-400 text-white cursor-not-allowed opacity-75'
                                        : 'bg-gradient-to-b from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                                        }`}
                                >
                                    {exportLoading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Exporting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileDown className="w-3.5 h-3.5" />
                                            <span>Export</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <DataTable
                columns={columns}
                data={leads}
                loading={loading}
                totalEntries={totalEntries}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <ExportModal
                open={open}
                title={"Leads"}
                onClose={() => {
                    setOpen(false);
                    setTimeout(() => {
                        setExportData([]);
                    }, 300);
                }}
                data={exportData}
                loading={exportLoading}
            />

            <ColumnCustomizeDialog
                open={customizeOpen}
                title="Customize Lead Columns"
                columns={columnOptions}
                selected={columnVisibility}
                onChange={(updated) => setColumnVisibility(prev => ({ ...prev, ...updated }))}
                onClose={() => setCustomizeOpen(false)}
            />
        </div>
    );
}