"use client";

import { useState, useEffect } from "react";
import { FileDown, X, Layers, Eye, Trash2, Settings, FileUp, } from "lucide-react";

import toast from "react-hot-toast";
import { DataTable } from "@/components/Tablecomponents";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { importOthers, getOthers, deleteOther, createLeadFromOther } from "@/app/lib/request/othersRequest";
import ViewDialog from "@/components/ViewDialog";
import { Column } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ExportModal from "@/components/ExportModal";
import Link from "next/link";
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


export default function Otherspages() {
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
    const [importDataSource, setImportDataSource] = useState("");
    const [importFile, setImportFile] = useState<File | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [dataSources, setDataSources] = useState<{ value: string; label: string }[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    /* ---------------- Table ---------------- */
    const [others, setOthers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [leadConfirmOpen, setLeadConfirmOpen] = useState(false);
    const [leadLoading, setLeadLoading] = useState(false);


    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const limit = 10;

    const PREVIEW_LIMIT = 3;


    const [showNewSourceInput, setShowNewSourceInput] = useState(false);
    const [newSource, setNewSource] = useState("");
    const [selected, setSelected] = useState<any | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmType, setConfirmType] = useState<"delete" | null>(null);
    /* ---------------- CSV Preview ---------------- */
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);

    const [columnVisibility, setColumnVisibility] = useState({
        recordId: true,
        institute: true,
        name: true,
        phone: true,
        dataSource: true,
        date: true,
        extraFields: true,
        createdBy: true,
        createdAt: true,
    });
    const columnOptions = [
        { key: "institute", label: "Institute" },
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "dataSource", label: "Data Source" },
        { key: "date", label: "Date" },
        { key: "extraFields", label: "Extra Fields" },
        { key: "createdBy", label: "Created By" },
        { key: "createdAt", label: "Created At" },
    ];
    const columns = [


        columnVisibility.institute && {
            header: "Institute",
            render: (o: any) => o.institute?.name || o.instituteId || "—",
        },
        columnVisibility.dataSource && {
            header: "Data Source",
            render: (o: any) => o.dataSource || "—",
        },

        columnVisibility.name && {
            header: "Name",
            render: (o: any) => o.name || "—",
        },

        columnVisibility.phone && {
            header: "Phone",
            render: (o: any) => o.phone || "—",
        },

        columnVisibility.date && {
            header: "Date",
            render: (o: any) => o.date || "—",
        },

        columnVisibility.extraFields && {
            header: "Extra Fields",
            render: (o: any) => {
                const entries = o?.extraFields
                    ? Object.entries(o.extraFields)
                    : [];

                const visible = entries.slice(0, 2);
                const remaining = entries.length - 2;

                return (
                    <div className="max-w-xs text-xs space-y-1">
                        {visible.length > 0 ? (
                            <>
                                {visible.map(([k, v]: any) => (
                                    <div key={k}>
                                        <span className="font-semibold">{k}:</span>{" "}
                                        <span className="text-gray-600">{v}</span>
                                    </div>
                                ))}

                                {remaining > 0 && (
                                    <div className="text-indigo-600 font-medium">
                                        +{remaining} more
                                    </div>
                                )}
                            </>
                        ) : (
                            "—"
                        )}
                    </div>
                );
            },
        },



        columnVisibility.createdBy && {
            header: "Created By",
            render: (o: any) =>
                o.creator
                    ? `${o.creator.firstname} ${o.creator.lastname}`
                    : "—",
        },

        columnVisibility.createdAt && {
            header: "Created At",
            render: (o: any) =>
                new Date(o.createdAt).toLocaleDateString(),
        },

        {
            header: "Actions",
            render: (o: any) => {
                const hasLead = Boolean(o.leadId);

                return (
                    <div className="flex gap-2">
                        {/* Create Lead */}
                        {!hasLead && (userpermission === "superadmin" || userpermission?.create) && (
                            <button
                                onClick={() => {
                                    setSelected(o);
                                    setLeadConfirmOpen(true);
                                }}
                                className="
      w-28 h-6
      flex items-center justify-center
      rounded-md
      bg-indigo-600 text-white text-sm font-medium
      hover:bg-indigo-700
      active:scale-95
      transition
      shadow-sm
    "
                            >
                                Create Lead
                            </button>
                        )}

                        {/* View Lead */}
                        {hasLead && (
                            <button
                                onClick={() => {
                                    window.location.href = `/leads/${o.leadId}`;
                                }}
                                className="
      w-28 h-6
      flex items-center justify-center
      rounded-md
      bg-emerald-600 text-white text-sm font-medium
      hover:bg-emerald-700
      active:scale-95
      transition
      shadow-sm
    "
                            >
                                View Lead
                            </button>
                        )}

                        {/* View Other */}
                        {(userpermission === "superadmin" || userpermission?.view) && (
                            <Link
                                href={`/others/${o._id}` as any}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md
                                         flex items-center justify-center"
                            >
                                <Eye className="w-4 h-4" />
                            </Link>
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
        }


    ].filter(Boolean) as Column<any>[];


    const fetchOthers = async () => {
        try {
            setLoading(true);

            const res = await getOthers({
                page: currentPage,
                limit,
                instituteId:
                    userpermission === "superadmin" && selectedInstitution !== "all"
                        ? selectedInstitution
                        : undefined,
                dataSource: filterDataSource || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });

            setOthers(res.docs);
            setTotalPages(res.totalPages);
            setTotalCount(res.totalDocs)
            if (Array.isArray(res.dataSources)) {
                setDataSources(
                    res.dataSources.map((ds: string) => ({
                        value: ds,
                        label: ds.charAt(0).toUpperCase() + ds.slice(1), // Capitalize first letter
                    }))
                );
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to fetch records");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchOthers();

    }, [
        currentPage,
        selectedInstitution,
        filterDataSource,
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
                            (p: any) => p.moduleName === "Others"
                        );

                        if (!permission) {
                            toast.error("Others permission not assigned");
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

    const filteredOthers = (others || []).map((o: any) => {
        const obj: any = {};

        if (columnVisibility.institute) {
            obj.Institute = o.institute?.name || o.instituteId || "-";
        }

        if (columnVisibility.dataSource) {
            obj["Data Source"] = o.dataSource || "-";
        }

        if (columnVisibility.name) {
            obj.Name = o.name || "-";
        }

        if (columnVisibility.phone) {
            obj.Phone = o.phone || "-";
        }

        if (columnVisibility.date) {
            obj.Date = o.date || "-";
        }

        if (columnVisibility.extraFields) {
            obj["Extra Fields"] =
                o.extraFields && Object.keys(o.extraFields).length > 0
                    ? Object.entries(o.extraFields)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" | ")
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
        if (isImporting) return; // prevent double click

        if (userpermission === "superadmin" && !importInstitution) {
            toast.error("Please select institution");
            return;
        }

        if (!importDataSource) {
            toast.error("Please select data source");
            return;
        }

        if (!importFile) {
            toast.error("Please upload CSV file");
            return;
        }

        try {
            setIsImporting(true); // 🔥 start loading

            await importOthers(importFile, importDataSource, importInstitution);

            toast.success("Import started successfully 🚀");
            setShowImportModal(false);
            resetImportState();
            setImportErrors(null);
        } catch (err: any) {
            console.log("IMPORT ERROR:", err);

            if (
                err.missingFields ||
                err.duplicatesInSheet ||
                err.duplicatesInDB
            ) {
                setImportErrors({
                    missingFields: err.missingFields || [],
                    duplicatesInSheet: err.duplicatesInSheet || [],
                    duplicatesInDB: err.duplicatesInDB || []
                });

                toast.error(err.message || "Validation errors found");
            } else {
                toast.error("Import failed");
            }
        } finally {
            setIsImporting(false); // 🔥 stop loading (always runs)
        }
    };



    const fetchDataSourcesByInstitution = async (institutionId: string) => {
        try {
            if (!institutionId) return;

            const res = await getOthers({
                page: 1,
                limit: 1, // We only need dataSources
                instituteId: institutionId
            });

            if (Array.isArray(res.dataSources)) {
                setDataSources(
                    res.dataSources.map((ds: string) => ({
                        value: ds,
                        label: ds.charAt(0).toUpperCase() + ds.slice(1),
                    }))
                );
            } else {
                setDataSources([]);
            }
        } catch (err: any) {
            toast.error("Failed to fetch data sources for institution");
        }
    };

    const resetImportState = () => {
        setImportInstitution("");
        setImportDataSource("");
        setImportFile(null);
        setImportErrors(null);

        setCsvHeaders([]);
        setCsvRows([]);

        setShowNewSourceInput(false);
        setNewSource("");
        fetchOthers()
    };

    const handleDelete = async () => {
        if (!selected?._id) return;

        try {
            await deleteOther(selected._id);
            toast.success("Record deleted successfully");
            setConfirmOpen(false);
            setSelected(null);
            fetchOthers(); // refresh table
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
            fetchOthers();
        } catch (err: any) {
            toast.error(err.message || "Failed to create lead");
        }
    };


    const downloadRecommendedSheet = () => {
        const csvContent = `name,phone,date,email,source,remarks
John Doe,9876543210,2025-01-01,john@example.com,Website,
Jane Smith,9123456789,2025-01-02,jane@example.com,Referral,Interested`;

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "recommended_template.csv";
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };






    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                {/* LEFT SIDE */}
                <div className="flex items-center gap-3">
                    <Layers className="w-6 h-6 text-indigo-700" />
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
                        Others
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

                <div className="
    bg-white 
    border border-slate-200 
    rounded-2xl 
    px-6 py-5
">

                    {/* FILTER ROW */}
                    <div className="
        flex flex-col lg:flex-row 
        lg:items-end lg:justify-between 
        gap-6
    ">

                        {/* LEFT FILTERS */}
                        <div className="
            flex flex-col sm:flex-row 
            flex-wrap gap-5
        ">

                            {userpermission === "superadmin" && (


                                <div className="flex flex-col w-full sm:w-56">
                                    <label className="text-xs font-medium text-slate-500 mb-1">
                                        Institution
                                    </label>
                                    <select
                                        value={selectedInstitution}
                                        onChange={(e) => setSelectedInstitution(e.target.value)}
                                        className="
                            h-10 px-3 rounded-lg
                            border border-slate-300
                            text-sm text-slate-700
                            focus:outline-none
                            focus:ring-1 focus:ring-slate-400
                        "
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

                            <div className="flex flex-col w-full sm:w-44">
                                <label className="text-xs font-medium text-slate-500 mb-1">
                                    Data Source
                                </label>
                                <select
                                    value={filterDataSource}
                                    onChange={(e) => setFilterDataSource(e.target.value)}
                                    className="
                        h-10 px-3 rounded-lg
                        border border-slate-300
                        text-sm text-slate-700
                        focus:outline-none
                        focus:ring-1 focus:ring-slate-400
                    "
                                >
                                    <option value="">All</option>
                                    {dataSources.map((src) => (
                                        <option key={src.value} value={src.value}>
                                            {src.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col w-full sm:w-40">
                                <label className="text-xs font-medium text-slate-500 mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="
                        h-10 px-3 rounded-lg
                        border border-slate-300
                        text-sm text-slate-700
                        focus:outline-none
                        focus:ring-1 focus:ring-slate-400
                    "
                                />
                            </div>

                            <div className="flex flex-col w-full sm:w-40">
                                <label className="text-xs font-medium text-slate-500 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="
                        h-10 px-3 rounded-lg
                        border border-slate-300
                        text-sm text-slate-700
                        focus:outline-none
                        focus:ring-1 focus:ring-slate-400
                    "
                                />
                            </div>

                        </div>

                        {/* RIGHT TOTAL */}
                        <div className="
            flex items-center justify-between
            min-w-[180px]
            px-5 py-3
            rounded-xl
            border border-slate-200
            bg-slate-50
        ">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                Total Records
                            </p>
                            <p className="text-2xl font-semibold text-slate-800">
                                {totalCount}
                            </p>
                        </div>

                    </div>
                </div>)}


            <DataTable
                columns={columns}
                data={others}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <ConfirmDialog
                open={confirmOpen}
                title="Delete Other data"
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
                title="User Details"
                data={{
                    Name: selected?.name || "—",
                    Phone: selected?.phone || "—",
                    "Data Source": selected?.dataSource || "—",
                    Date: selected?.date || "—",
                    Institute: selected?.institute?.name || "—",
                    "Created By": selected?.creator
                        ? `${selected.creator.firstname} ${selected.creator.lastname}`
                        : "—",
                    "Created At": selected?.createdAt
                        ? new Date(selected.createdAt).toLocaleString()
                        : "—",
                    "Extra Fields":
                        selected?.extraFields &&
                            Object.keys(selected.extraFields).length > 0
                            ? Object.entries(selected.extraFields)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ")
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
                title={"Othersdata"}
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

                        <h2 className="text-lg font-semibold">Import Data</h2>

                        {userpermission === "superadmin" && (
                            <div className="flex flex-col">
                                <label className="text-sm">Institution</label>
                                <select
                                    value={importInstitution}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setImportInstitution(value);

                                        // Fetch data sources for this institution
                                        fetchDataSourcesByInstitution(value);
                                        setImportDataSource(""); // Reset previously selected
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


                        {/* Data Source */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm">Data Source</label>
                            <select
                                value={importDataSource}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "__add_new__") {
                                        setShowNewSourceInput(true);
                                        setImportDataSource("");
                                    } else {
                                        setImportDataSource(v);
                                    }
                                }}
                                className="border rounded-md py-2 px-3"
                            >
                                <option value="">-- Select Data Source --</option>
                                {dataSources.map((src) => (
                                    <option key={src.value} value={src.value}>
                                        {src.label}
                                    </option>
                                ))}
                                <option value="__add_new__">➕ Add New</option>
                            </select>

                            {showNewSourceInput && (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        autoFocus
                                        placeholder="Enter new data source"
                                        value={newSource}
                                        onChange={(e) => setNewSource(e.target.value)}
                                        className="flex-1 border rounded-md py-2 px-3"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newSource.trim()) {
                                                toast.error("Enter data source name");
                                                return;
                                            }
                                            const value = newSource.toLowerCase().replace(/\s+/g, "_");

                                            setDataSources((prev) => {
                                                if (prev.find((p) => p.value === value)) {
                                                    toast.error("Data source already exists");
                                                    return prev;
                                                }
                                                return [...prev, { value, label: newSource }];
                                            });

                                            setImportDataSource(value); // auto select new
                                            setNewSource("");
                                            setShowNewSourceInput(false);
                                        }}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                                    >
                                        Add
                                    </button>
                                </div>
                            )}
                        </div>


                        {/* File Upload */}
                        <div className="flex flex-col">


                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">
                                    Upload CSV{" "}
                                    <span className="ml-2 text-xs text-gray-500">
                                        Required columns:
                                        <b className="ml-1 text-red-500">name, phone, date</b>
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
                                    <thead className="bg-red-50 sticky top-0">
                                        <tr>
                                            <th className="border px-3 py-2 text-left">Type</th>
                                            <th className="border px-3 py-2 text-left">Phone</th>
                                            <th className="border px-3 py-2 text-left">Rows</th>
                                            <th className="border px-3 py-2 text-left">Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>

                                        {importErrors.missingFields.map((e, i) => (
                                            <tr key={`missing-${i}`} className="bg-orange-50">
                                                <td className="border px-3 py-2 font-semibold">Missing Field</td>
                                                <td className="border px-3 py-2">—</td>
                                                <td className="border px-3 py-2">Row {e.row}</td>
                                                <td className="border px-3 py-2 text-red-600">{e.message}</td>
                                            </tr>
                                        ))}
                                        {importErrors.duplicatesInSheet.map((e, i) => (
                                            <tr key={`sheet-${i}`} className="bg-yellow-50">
                                                <td className="border px-3 py-2 font-semibold">Sheet Duplicate</td>
                                                <td className="border px-3 py-2">{e.phone}</td>
                                                <td className="border px-3 py-2">{e.rows.join(", ")}</td>
                                                <td className="border px-3 py-2 text-red-600">{e.message}</td>
                                            </tr>
                                        ))}

                                        {importErrors.duplicatesInDB.map((e, i) => (
                                            <tr key={`db-${i}`} className="bg-red-50">
                                                <td className="border px-3 py-2 font-semibold">DB Duplicate</td>
                                                <td className="border px-3 py-2">{e.phone}</td>
                                                <td className="border px-3 py-2">{e.rows.join(", ")}</td>
                                                <td className="border px-3 py-2 text-red-600">{e.message}</td>
                                            </tr>
                                        ))}

                                        {importErrors.duplicatesInSheet.length === 0 &&
                                            importErrors.duplicatesInDB.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="text-center py-4 text-gray-500">
                                                        No validation errors
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
