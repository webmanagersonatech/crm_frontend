"use client";

import { useState, useEffect } from "react";
import { FileDown, ChevronDown, X } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";

export default function OthersPage() {
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [institutions, setInstitutions] = useState<{ value: string; label: string }[]>([]);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);

  const [dataSource, setDataSource] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showImportModal, setShowImportModal] = useState(false);
  const [importDataSource, setImportDataSource] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  // Fetch user permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUserpermisssion(null);
        return;
      }
      try {
        const payload = token.split(".")[1];
        const decoded: any = JSON.parse(atob(payload));
        if (decoded.role === "superadmin") {
          setUserpermisssion("superadmin");
        } else {
          const data = await getaccesscontrol({
            userId: decoded.id,
            instituteId: decoded.instituteId,
          });
          const perm = data.permissions?.find((p: any) => p.moduleName === "Others");
          setUserpermisssion(perm || null);
          
        }
      } catch (err) {
        console.error(err);
        setUserpermisssion(null);
      }
    };
    fetchPermissions();
  }, []);

  
  // Load Institutions
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const activeInstitutions = await getActiveInstitutions();
        const options = activeInstitutions.map((inst: any) => ({
          value: inst.instituteId,
          label: inst.name,
        }));
        setInstitutions(options);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load institutions");
      }
    };
    loadInstitutions();
  }, []);

  const handleImportSubmit = () => {
    if (!importDataSource || !importFile) {
      toast.error("Please select data source and file.");
      return;
    }
    // handle your import logic here
    console.log("Importing", importDataSource, importFile);
    toast.success("Import started!");
    setShowImportModal(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
          Others
        </h1>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-md"
        >
          <FileDown className="w-5 h-5" />
          Import Data
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow border border-gray-200 dark:border-neutral-800 flex flex-wrap gap-4 items-end">
        
        {userpermission === "superadmin" && (
          <div className="flex flex-col">
            <label className="text-sm mb-1">Select Institution</label>
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            >
              <option value="all">All Institutions</option>
              {institutions.map((inst) => (
                <option key={inst.value} value={inst.value}>
                  {inst.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col">
          <label className="text-sm mb-1">Data Source</label>
          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="">-- Select Data Source --</option>
            <option value="csv">CSV Source (Mandatory Fields: Name, Phone, Date)</option>
            <option value="api">API Source</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          />
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-lg w-full max-w-md space-y-4 relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">Import Data</h2>

            <div className="flex flex-col gap-3">
              <label className="text-sm">Data Source</label>
              <select
                value={importDataSource}
                onChange={(e) => setImportDataSource(e.target.value)}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              >
                <option value="">-- Select Data Source --</option>
                <option value="csv">CSV Source (Mandatory Fields: Name, Phone, Date)</option>
                <option value="api">API Source</option>
              </select>

              <label className="text-sm">Upload File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="border rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />
            </div>

            <button
              onClick={handleImportSubmit}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
            >
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
