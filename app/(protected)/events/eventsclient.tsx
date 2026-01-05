"use client";

import { useState, useEffect } from "react";
import { FileDown, X, Calendar, Eye, Pencil, Trash2, Settings, FileUp, } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import toast from "react-hot-toast";
import { DataTable } from "@/components/Tablecomponents";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { createLeadFromOther } from "@/app/lib/request/othersRequest";
import { importEvents, getEvents, deleteEvent, } from "@/app/lib/request/eventsRequest";
import EditEventForm from "@/components/Forms/Editeventform";
import ViewDialog from "@/components/ViewDialog";
import { Column } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ExportModal from "@/components/ExportModal";

import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
type ImportErrors = {
    missingFields: any[];
    duplicatesInSheet: {
        phone: string;
        rows: number[];
        message: string;
    }[];
    duplicatesInDB: {
        phone: string;
        rows: number[];
        message: string;
    }[];
};


export default function EventsPageClient() {
    /* ---------------- Common ---------------- */
    const [institutions, setInstitutions] = useState<{ value: string; label: string }[]>([]);
    const [userpermission, setUserpermission] = useState<any | null>(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [customizeOpen, setCustomizeOpen] = useState(false);
    /* ---------------- Filters ---------------- */
    const [selectedInstitution, setSelectedInstitution] = useState("all");
    const [filterDataSource, setFilterDataSource] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [importErrors, setImportErrors] = useState<ImportErrors | null>(null);
    /* ---------------- Import ---------------- */
    const [showImportModal, setShowImportModal] = useState(false);
    const [importInstitution, setImportInstitution] = useState("");

    const [importFile, setImportFile] = useState<File | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [open, setOpen] = useState(false);


    // Importing state
    const [isImporting, setIsImporting] = useState(false);

    // Fetched events for the table
    const [events, setEvents] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [leadConfirmOpen, setLeadConfirmOpen] = useState(false);

    const [filterName, setFilterName] = useState("");
    const [filterMobile, setFilterMobile] = useState("");
    const [filterEventName, setFilterEventName] = useState("");


    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const limit = 10;

    const PREVIEW_LIMIT = 3;




    const [selected, setSelected] = useState<any | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmType, setConfirmType] = useState<"delete" | null>(null);
    /* ---------------- CSV Preview ---------------- */
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);

    const [columnVisibility, setColumnVisibility] = useState({

        institute: true,
        name: true,
        mobile: true,
        email: true,
        location: true,
        eventName: true,

        enrolledDate: true,

        createdBy: true,
        createdAt: true,
    });

    const columnOptions = [
        { key: "institute", label: "Institute" },
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "email", label: "Email" },
        { key: "location", label: "Location" },
        { key: "eventName", label: "Event Name" },
        { key: "enrolledDate", label: "Enrolled Date" },
        { key: "createdBy", label: "Created By" },
        { key: "createdAt", label: "Created At" },
    ];

    const columns = [
        columnVisibility.institute && {
            header: "Institute",
            render: (o: any) => o.institute?.name || o.instituteId || "—",
        },

        columnVisibility.name && {
            header: "Name",
            render: (o: any) => o.name || "—",
        },
        columnVisibility.mobile && {
            header: "Mobile",
            render: (o: any) => o.mobile || "—",
        },

        columnVisibility.email && {
            header: "Email",
            render: (o: any) => o.email || "—",
        },
        columnVisibility.eventName && {
            header: "Event Name",
            render: (o: any) => o.eventName || "—",
        },
        columnVisibility.location && {
            header: "Location",
            render: (o: any) => o.location || "—",
        },

        columnVisibility.enrolledDate && {
            header: "Enrolled Date",
            render: (o: any) => o.enrolledDate ? new Date(o.enrolledDate).toLocaleDateString() : "—",
        },
        columnVisibility.createdBy && {
            header: "Created By",
            render: (o: any) => o.creator ? `${o.creator.firstname} ${o.creator.lastname}` : "—",
        },
        columnVisibility.createdAt && {
            header: "Created At",
            render: (o: any) => new Date(o.createdAt).toLocaleDateString(),
        },

        {
            header: "Actions",
            render: (o: any) => {


                return (
                    <div className="flex gap-2">





                        {/* View Details */}
                        {(userpermission === "superadmin" || userpermission?.view) && (
                            <button
                                onClick={() => {
                                    setSelected(o);
                                    setViewOpen(true);
                                }}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                        )}
                        {/* Edit */}
                        {(userpermission === "superadmin" || userpermission?.edit) && (
                            <button
                                onClick={() => {
                                    setSelected(o);
                                    setEditOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}

                        {/* Delete */}
                        {(userpermission === "superadmin" || userpermission?.delete) && (
                            <button
                                onClick={() => {
                                    setSelected(o);
                                    setConfirmType("delete");
                                    setConfirmOpen(true);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                );
            },
        },
    ].filter(Boolean) as Column<any>[];



    const fetchEvents = async () => {
        try {
            setLoading(true);

            const res = await getEvents({
                page: currentPage,
                limit,
                instituteId:
                    userpermission === "superadmin" && selectedInstitution !== "all"
                        ? selectedInstitution
                        : undefined,
                name: filterName || undefined,
                mobile: filterMobile || undefined,
                eventName: filterEventName || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });

            setEvents(res.docs);
            setTotalPages(res.totalPages);
            setTotalCount(res.totalDocs);
        } catch (err: any) {
            toast.error(err.message || "Failed to fetch records");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchEvents();
    }, [
        currentPage,
        selectedInstitution,
        filterName,
        filterMobile,
        filterEventName,
        startDate,
        endDate,
    ]);



    /* ---------------- Permissions ---------------- */
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const payload: any = JSON.parse(atob(token.split(".")[1]));

            if (payload.role === "superadmin") {
                setUserpermission("superadmin");
                setImportInstitution(payload.instituteId);
            } else {
                getaccesscontrol({
                    userId: payload.id,
                    instituteId: payload.instituteId,
                })
                    .then((data) => {

                        const permission = data.permissions?.find(
                            (p: any) => p.moduleName === "events"
                        );

                        if (!permission) {
                            toast.error("Events permission not assigned");
                            return;
                        }

                        setUserpermission(permission);
                        setImportInstitution(payload.instituteId);
                    })
                    .catch(() => {
                        toast.error("Failed to fetch permissions");
                    });
            }
        } catch (e) {
            console.error(e);
            toast.error("Invalid login session");
        }
    }, []);

    const filteredOthers = (events || []).map((o: any) => {
        const obj: any = {};

        if (columnVisibility.institute) {
            obj.Institute = o.institute?.name || o.instituteId || "-";
        }

        if (columnVisibility.name) {
            obj.Name = o.name || "-";
        }

        if (columnVisibility.mobile) {
            obj.Mobile = o.mobile || "-";
        }

        if (columnVisibility.email) {
            obj.Email = o.email || "-";
        }

        if (columnVisibility.location) {
            obj.Location = o.location || "-";
        }

        if (columnVisibility.eventName) {
            obj.Event = o.eventName || "-";
        }


        if (columnVisibility.enrolledDate) {
            obj["Enrolled Date"] = o.enrolledDate
                ? new Date(o.enrolledDate).toLocaleDateString()
                : "-";
        }


        if (columnVisibility.createdBy) {
            obj["Created By"] = o.creator
                ? `${o.creator.firstname} ${o.creator.lastname}`
                : "-";
        }

        if (columnVisibility.createdAt) {
            obj["Created At"] = o.createdAt
                ? new Date(o.createdAt).toLocaleDateString()
                : "-";
        }

        return obj;
    });





    /* ---------------- Institutions ---------------- */
    useEffect(() => {
        getActiveInstitutions()
            .then((res) => {
                setInstitutions(
                    res.map((i: any) => ({
                        value: i.instituteId,
                        label: i.name,
                    }))
                );
            })
            .catch(() => toast.error("Failed to load institutions"));
    }, []);

    /* ---------------- Import Submit ---------------- */
    const handleImportSubmit = async () => {
        if (isImporting) return;

        if (userpermission === "superadmin" && !importInstitution) {
            toast.error("Please select an institution");
            return;
        }

        if (!importFile) {
            toast.error("Please upload a CSV/XLSX file");
            return;
        }

        try {
            setIsImporting(true);

            // Call events import API
            await importEvents(importFile, importInstitution);

            toast.success("Events import started successfully 🚀");
            setShowImportModal(false);
            resetImportState();
            setImportErrors(null);
        } catch (err: any) {
            console.error("IMPORT ERROR:", err);

            if (err.sheetErrors || err.duplicatesInSheet || err.duplicatesInDB) {
                setImportErrors({
                    missingFields: err.sheetErrors || [],
                    duplicatesInSheet: err.duplicatesInSheet || [],
                    duplicatesInDB: err.duplicatesInDB || [],
                });
                toast.error(err.message || "Validation errors found");
            } else {
                toast.error("Import failed");
            }
        } finally {
            setIsImporting(false);
        }
    };





    const resetImportState = () => {
        setImportInstitution("");

        setImportFile(null);
        setImportErrors(null);

        setCsvHeaders([]);
        setCsvRows([]);

        fetchEvents()
    };

    const handleDelete = async () => {
        if (!selected?._id) return;

        try {
            await deleteEvent(selected._id);
            toast.success("Event deleted successfully");
            setConfirmOpen(false);
            setSelected(null);
            fetchEvents(); // refresh table
        } catch (err: any) {
            toast.error(err.message || "Failed to delete record");
        }
    };
    const handleCreateLead = async () => {
        if (!selected?.recordId) return;

        try {
            await createLeadFromOther(selected.recordId);

            toast.success("Lead created successfully");
            setLeadConfirmOpen(false);
            setSelected(null);
            fetchEvents();
        } catch (err: any) {
            toast.error(err.message || "Failed to create lead");
        }
    };


    const downloadRecommendedSheet = () => {
        const csv = `Name,Mobile,Email,Location,Event Name,Enrolled Date
John Doe,9876543210,john@example.com,Chennai,React Workshop,2025-01-05`;

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "events_import_template.csv";
        a.click();

        URL.revokeObjectURL(url);
    };







    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                {/* LEFT SIDE */}
                <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-indigo-700" />
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
                        Events
                    </h1>

                    {(userpermission === "superadmin" || userpermission?.filter) && (<button
                        onClick={() => setCustomizeOpen(true)}
                        className="flex items-center gap-2
                       bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91]
                       text-white px-4 py-2 text-sm
                       rounded-lg shadow-sm transition"
                    >
                        <Settings className="w-4 h-4" />
                        Customize Columns
                    </button>)}
                </div>

                {/* RIGHT SIDE */}
                <div className="flex items-center gap-3">
                    {(userpermission === "superadmin" || userpermission?.filter) && (
                        <button
                            onClick={() => setOpen(true)}
                            className="flex items-center gap-2
                           bg-white border border-indigo-300
                           text-indigo-700 px-4 py-2 text-sm
                           rounded-lg shadow-sm
                           hover:bg-indigo-50 transition"
                        >
                            <FileUp className="w-4 h-4" />
                            Export
                        </button>
                    )}
                    {(userpermission === "superadmin" || userpermission?.create) && (
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-2
                       bg-emerald-300 border border-emerald-600 hover:bg-emerald-600 hover:text-white
                       text-emerald-600 px-4 py-2 text-sm
                       rounded-lg shadow-sm transition"
                        >
                            <FileDown className="w-4 h-4" />
                            Import Data
                        </button>
                    )}
                </div>
            </div>



            {/* ---------------- Filters ---------------- */}
            {(userpermission === "superadmin" || userpermission?.filter) && (
                <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5">

                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">

                        {/* LEFT FILTERS */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-5">

                            {/* Institution */}
                            {userpermission === "superadmin" && (
                                <div className="flex flex-col w-full sm:w-56">
                                    <label className="text-xs font-medium text-slate-500 mb-1">
                                        Institution
                                    </label>
                                    <select
                                        value={selectedInstitution}
                                        onChange={(e) => setSelectedInstitution(e.target.value)}
                                        className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                                    >
                                        <option value="all">All Institutions</option>
                                        {institutions.map((i) => (
                                            <option key={i.value} value={i.value}>
                                                {i.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Name */}
                            <div className="flex flex-col w-full sm:w-44">
                                <label className="text-xs font-medium text-slate-500 mb-1">
                                    Name
                                </label>
                                <input
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    placeholder="Search name"
                                    className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                                />
                            </div>

                            {/* Mobile */}
                            <div className="flex flex-col w-full sm:w-44">
                                <label className="text-xs font-medium text-slate-500 mb-1">
                                    Mobile
                                </label>
                                <input
                                    value={filterMobile}
                                    onChange={(e) => setFilterMobile(e.target.value)}
                                    placeholder="Search mobile"
                                    className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                                />
                            </div>

                            {/* Event Name */}
                            <div className="flex flex-col w-full sm:w-44">
                                <label className="text-xs font-medium text-slate-500 mb-1">
                                    Event
                                </label>
                                <input
                                    value={filterEventName}
                                    onChange={(e) => setFilterEventName(e.target.value)}
                                    placeholder="Search event"
                                    className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                                />
                            </div>

                            {/* Start Date */}
                            <div className="flex flex-col w-full sm:w-40">
                                <label className="text-xs font-medium text-slate-500 mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                                />
                            </div>

                            {/* End Date */}
                            <div className="flex flex-col w-full sm:w-40">
                                <label className="text-xs font-medium text-slate-500 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                                />
                            </div>

                        </div>

                        {/* TOTAL */}
                        <div className="flex items-center justify-between min-w-[180px] px-5 py-3 rounded-xl border bg-slate-50">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                Total Records
                            </p>
                            <p className="text-2xl font-semibold text-slate-800">
                                {totalCount}
                            </p>
                        </div>

                    </div>
                </div>
            )}



            <DataTable
                columns={columns}
                data={events}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <AnimatePresence>
                {editOpen && selected && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    >
                        <motion.div
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -50, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[70vh] relative flex flex-col"
                        >
                            {/* Close */}
                            <button
                                onClick={() => setEditOpen(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Content */}
                            <div className="overflow-y-auto p-6 flex-1">
                                <EditEventForm
                                    eventId={selected._id}
                                    onClose={() => setEditOpen(false)}
                                    onSuccess={() => {
                                        setEditOpen(false);
                                        fetchEvents();
                                    }}
                                />

                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            <ConfirmDialog
                open={confirmOpen}
                title="Delete Event data"
                message={`Are you sure you want to delete  "${selected?.name || "Unknown "
                    } data"?`}
                onConfirm={handleDelete}
                onCancel={() => setConfirmOpen(false)}
            />
            <ConfirmDialog
                open={leadConfirmOpen}
                title="Create Lead"
                message={`Create lead for "${selected?.name}"?`}
                onConfirm={handleCreateLead}
                onCancel={() => setConfirmOpen(false)}
            />


            <ViewDialog
                open={viewOpen}
                title="Event User Details"
                data={{
                    Institute: selected?.institute?.name || selected?.instituteId || "—",
                    Name: selected?.name || "—",
                    Mobile: selected?.mobile || "—",
                    Email: selected?.email || "—",
                    Location: selected?.location || "—",
                    "Event Name": selected?.eventName || "—",
                    "Enrolled Date": selected?.enrolledDate
                        ? new Date(selected.enrolledDate).toLocaleDateString()
                        : "—",
                    "Created By": selected?.creator
                        ? `${selected.creator.firstname} ${selected.creator.lastname}`
                        : "—",
                    "Created At": selected?.createdAt
                        ? new Date(selected.createdAt).toLocaleString()
                        : "—",

                }}
                onClose={() => setViewOpen(false)}
            />

            <ColumnCustomizeDialog
                open={customizeOpen}
                title="Customize Application Columns"
                columns={columnOptions}
                selected={columnVisibility}
                onChange={(updated) =>
                    setColumnVisibility(prev => ({ ...prev, ...updated }))
                }
                onClose={() => setCustomizeOpen(false)}
            />
            <ExportModal
                open={open}
                title={"Events data"}
                onClose={() => setOpen(false)}
                data={filteredOthers}
            />

            {/* ---------------- Import Modal ---------------- */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-3xl space-y-5 relative">
                        <button onClick={() => {
                            resetImportState();
                            setShowImportModal(false);
                        }} className="absolute top-3 right-3 text-gray-500">
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-lg font-semibold">Import Events</h2>

                        {userpermission === "superadmin" && (
                            <div className="flex flex-col">
                                <label className="text-sm">Institution</label>
                                <select
                                    value={importInstitution}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setImportInstitution(value);
                                    }}
                                    className="border rounded-md py-2 px-3"
                                >
                                    <option value="">-- Select Institution --</option>
                                    {institutions.map((i) => (
                                        <option key={i.value} value={i.value}>
                                            {i.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* File Upload */}
                        <div className="flex flex-col">


                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">
                                    Upload CSV
                                    <span className="ml-2 text-xs">
                                        Required columns:
                                        <span className="ml-1 text-red-600 font-semibold">
                                            Name, Mobile, Email, Location, Event Name
                                        </span>
                                    </span>
                                </label>


                                <button
                                    type="button"
                                    onClick={downloadRecommendedSheet}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 my-2 whitespace-nowrap"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Download Recommended Sheet
                                </button>

                            </div>


                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    setImportFile(file);

                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        const text = ev.target?.result as string;
                                        const lines = text.split("\n").filter(Boolean);
                                        setCsvHeaders(lines[0].split(",").map((h) => h.trim()));
                                        setCsvRows(lines.slice(1).map((l) => l.split(",").map((c) => c.trim())));
                                    };
                                    reader.readAsText(file);
                                }}
                                className="border rounded-md py-2 px-3"
                            />
                        </div>

                        {/* CSV Preview */}

                        {/* ---------------- CSV Preview (Only when no errors) ---------------- */}
                        {importFile && !importErrors && csvRows.length > 0 && (
                            <div className="border rounded-lg overflow-auto max-h-72">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            {csvHeaders.map((h, i) => (
                                                <th key={i} className="border px-3 py-2 text-left">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {csvRows.slice(0, PREVIEW_LIMIT).map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="border px-3 py-2">
                                                        {cell || "—"}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Hidden rows info */}
                                {csvRows.length > PREVIEW_LIMIT && (
                                    <div className="text-center text-sm text-gray-500 py-2 bg-gray-50">
                                        + {csvRows.length - PREVIEW_LIMIT} more rows hidden
                                    </div>
                                )}
                            </div>
                        )}

                        {importErrors && (
                            <div className="border rounded-lg overflow-auto max-h-96">
                                <table className="w-full text-sm">
                                    <thead className="bg-red-100 sticky top-0">
                                        <tr>
                                            <th className="border px-3 py-2 text-left">Issue Type</th>
                                            <th className="border px-3 py-2 text-left">Row</th>
                                            <th className="border px-3 py-2 text-left">Details</th>
                                            <th className="border px-3 py-2 text-left">What you should do</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {/* ---------------- Missing Fields ---------------- */}
                                        {importErrors.missingFields.map((e, i) => (
                                            <tr key={`missing-${i}`} className="bg-orange-50">
                                                <td className="border px-3 py-2 font-semibold text-orange-700">
                                                    Missing Data
                                                </td>
                                                <td className="border px-3 py-2 font-medium">
                                                    Row {e.row}
                                                </td>
                                                <td className="border px-3 py-2 text-red-600">
                                                    {e.message}
                                                </td>
                                                <td className="border px-3 py-2 text-gray-700">
                                                    Fill all required columns and re-upload the file
                                                </td>
                                            </tr>
                                        ))}

                                        {/* ---------------- Sheet Duplicates ---------------- */}
                                        {importErrors.duplicatesInSheet.map((e, i) => (
                                            <tr key={`sheet-${i}`} className="bg-yellow-50">
                                                <td className="border px-3 py-2 font-semibold text-yellow-700">
                                                    Duplicate in File
                                                </td>
                                                <td className="border px-3 py-2 font-medium">
                                                    Rows {e.rows.join(", ")}
                                                </td>
                                                <td className="border px-3 py-2 text-red-600">
                                                    Mobile number <b>{e.phone}</b> is repeated
                                                </td>
                                                <td className="border px-3 py-2 text-gray-700">
                                                    Keep only one row with this mobile number
                                                </td>
                                            </tr>
                                        ))}

                                        {/* ---------------- DB Duplicates ---------------- */}
                                        {importErrors.duplicatesInDB.map((e: any, i) => (
                                            <tr key={`db-${i}`} className="bg-red-50">
                                                <td className="border px-3 py-2 font-semibold text-red-700">
                                                    Already Exists
                                                </td>
                                                <td className="border px-3 py-2 font-medium">
                                                    Row {e.row}
                                                </td>
                                                <td className="border px-3 py-2 text-red-600">
                                                    {e.message}
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        Phone: {e.phone} <br />
                                                        Email: {e.email}
                                                    </div>
                                                </td>
                                                <td className="border px-3 py-2 text-gray-700">
                                                    Remove this row or update the existing record instead of importing again
                                                </td>
                                            </tr>
                                        ))}

                                        {/* ---------------- No Errors ---------------- */}
                                        {importErrors.missingFields.length === 0 &&
                                            importErrors.duplicatesInSheet.length === 0 &&
                                            importErrors.duplicatesInDB.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="text-center py-4 text-green-600 font-medium">
                                                        ✅ No validation errors found
                                                    </td>
                                                </tr>
                                            )}
                                    </tbody>
                                </table>
                            </div>
                        )}



                        <button
                            onClick={handleImportSubmit}
                            disabled={isImporting}
                            className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2
        ${isImporting
                                    ? "bg-green-400 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 text-white"}
    `}
                        >
                            {isImporting ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                        />
                                    </svg>
                                    Importing...
                                </>
                            ) : (
                                "Import Data"
                            )}
                        </button>

                    </div>
                </div>
            )}
        </div>
    );
}
