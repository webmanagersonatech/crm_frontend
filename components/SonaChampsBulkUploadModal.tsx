"use client";

import { useState } from "react";
import { X, FileDown, Loader2, UploadCloud, Info } from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx"; // ✅ Import xlsx for preview
import {
  bulkUploadSonaChamps,
  BulkUploadErrorResponse,
} from "@/app/lib/request/sonachamprequest";

const PREVIEW_LIMIT = 3; // ✅ Shows exactly 3 rows

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SonaChampsBulkUploadModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<BulkUploadErrorResponse | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setErrors(null);
    setCsvHeaders([]);
    setCsvRows([]);
  };

  const handleClose = () => {
    if (isImporting) return;
    reset();
    onClose();
  };

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setErrors(null);
    setCsvHeaders([]);
    setCsvRows([]);
    if (!f) return;

    const fileExt = f.name.split(".").pop()?.toLowerCase();

    // ✅ CSV Preview
    if (fileExt === "csv") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (!lines.length) return;
        setCsvHeaders(lines[0].split(",").map((h) => h.trim()));
        setCsvRows(
          lines.slice(1).map((l) => l.split(",").map((c) => c.trim()))
        );
      };
      reader.readAsText(f);
    } 
    // ✅ XLSX / XLS Preview
    else if (fileExt === "xlsx" || fileExt === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert sheet to array of arrays
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
        
        if (jsonData.length > 0) {
          // First row is headers
          setCsvHeaders(jsonData[0].map((h) => String(h).trim()));
          
          // Remaining rows are data
          const dataRows = jsonData.slice(1).map((row) => 
            row.map((cell) => String(cell).trim())
          );
          setCsvRows(dataRows);
        }
      };
      reader.readAsArrayBuffer(f);
    }
  };

  // ✅ Frontend-only CSV Template Generation
  const handleDownloadTemplate = () => {
    try {
      const headers = [
        "studentName",
        "class",
        "gender",
        "schoolName",
        "schoolLocation",
        "teacherCoordinatorName",
        "teacherCoordinatorMobile",
        "parentGuardianName",
        "parentGuardianMobile",
        "category",
        "event",
      ];

      const sampleRow = [
        "Arun Kumar",
        "X",
        "Male",
        "ABC Matriculation School",
        "Salem",
        "Ramesh",
        "9876543210",
        "Kumar",
        "9876501234",
        "Junior",
        "Drawing / Painting",
      ];

      const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "sona-champs-template.csv");
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Template downloaded");
    } catch (error) {
      toast.error("Failed to download template");
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (isImporting) return;

    setIsImporting(true);
    setErrors(null);
    try {
      const res = await bulkUploadSonaChamps(file);
      toast.success(res.message || "Bulk upload successful");
      reset();
      onSuccess();
    } catch (err: any) {
      if (err?.rowErrors) {
        setErrors(err);
        toast.error(err.message || "Validation errors found");
      } else {
        toast.error(err?.message || "Bulk upload failed");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const totalIssues = errors?.rowErrors?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          disabled={isImporting}
          className="absolute top-3 right-3 text-gray-500 disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold">
          Bulk Upload — SONA CHAMPS '26
        </h2>

        {/* File + template */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <label className="text-sm font-medium block mb-1">
              Upload CSV / XLSX
            </label>
            <p className="text-xs text-gray-500">
              Download the template below to ensure correct data format.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <FileDown className="w-4 h-4" />
            Download Template
          </button>
        </div>

        {/* ✅ Format Guide for Users */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
          <p className="font-semibold flex items-center gap-1 mb-2">
            <Info className="w-4 h-4" /> Format Guide (Strictly follow this)
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>class:</b> VI, VII, VIII, IX, X, XI, XII</li>
            <li><b>gender:</b> Male, Female, Other</li>
            <li><b>category:</b> Junior, Senior</li>
            <li><b>event:</b> Group Dance, Solo Dance, Singing, Spell Bee, Face Painting, Drawing / Painting, Gaming, Science Expo, Puzzle Quest, Veg / Fruit Cravings</li>
            <li><b>Mobile Numbers:</b> Must be 10 digits starting with 6-9 (Parent Mobile is Required)</li>
          </ul>
        </div>

        {/* Drop zone / file input */}
        <label
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition ${
            file
              ? "border-emerald-400 bg-emerald-50"
              : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
          }`}
        >
          <UploadCloud
            className={`w-8 h-8 mb-2 ${
              file ? "text-emerald-600" : "text-gray-400"
            }`}
          />
          <span className="text-sm text-gray-700">
            {file ? (
              <>
                <b>{file.name}</b>{" "}
                <span className="text-gray-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </>
            ) : (
              "Click to choose a file (.csv, .xlsx, .xls)"
            )}
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
            disabled={isImporting}
          />
        </label>

        {/* ✅ CSV / XLSX Preview (First 3 rows) */}
        {file && !errors && csvRows.length > 0 && (
          <div className="border rounded-lg overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {csvHeaders.map((h, i) => (
                    <th key={i} className="border px-3 py-2 text-left whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(0, PREVIEW_LIMIT).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="border px-3 py-2 truncate max-w-[150px]">
                        {cell || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvRows.length > PREVIEW_LIMIT && (
              <div className="text-center text-sm text-gray-500 py-2 bg-gray-50 sticky bottom-0">
                + {csvRows.length - PREVIEW_LIMIT} more rows hidden
              </div>
            )}
          </div>
        )}

        {/* Error summary banner */}
        {errors && totalIssues > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
            <b>{totalIssues}</b> issue{totalIssues > 1 ? "s" : ""} found — fix
            the sheet and upload again.
          </div>
        )}

        {/* Errors table */}
        {errors && (
          <div className="border rounded-lg overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="border px-3 py-2 text-left">Type</th>
                  <th className="border px-3 py-2 text-left">Rows</th>
                  <th className="border px-3 py-2 text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {errors.rowErrors?.map((e, i) => (
                  <tr key={`row-${i}`} className="bg-orange-50">
                    <td className="border px-3 py-2 font-semibold">
                      Row Error
                    </td>
                    <td className="border px-3 py-2">Row {e.row}</td>
                    <td className="border px-3 py-2 text-red-600">
                      {e.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="flex-1 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isImporting || !file}
            className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 text-white ${
              isImporting || !file
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              "Confirm & Upload"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}