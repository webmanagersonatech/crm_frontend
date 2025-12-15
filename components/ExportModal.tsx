"use client";
import { X } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast, { Toaster } from "react-hot-toast"; // using react-hot-toast

interface ExportModalProps {
    open: boolean;
    onClose: () => void;
    data: any[];
    title?: string;
}

export default function ExportModal({

    open,
    onClose,
    data = [],
    title = "Export As",
}: ExportModalProps) {
    if (!open) return null;

    /** --- Export Handlers --- */
    const handleEmptyData = () => {
        if (!data.length) {
            toast.error("No data to export!");
            return true;
        }
        return false;
    };

    const exportCSV = () => {
        if (handleEmptyData()) return;
        const header = Object.keys(data[0]);
        const csv = [
            header.join(","),
            ...data.map((row) =>
                header.map((field) => JSON.stringify(row[field] ?? "")).join(",")
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        a.download = `${title}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported!");
          onClose();
    };

    const exportExcel = () => {
        if (handleEmptyData()) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

        XLSX.writeFile(workbook, `${title}.xlsx`);
        toast.success("Excel exported!");
          onClose();
    };

    const exportPDF = () => {
        if (handleEmptyData()) return;
        const doc = new jsPDF();
        const headers = [Object.keys(data[0]) as string[]];
        const rows = data.map((row) =>
            Object.values(row).map((v) => String(v ?? ""))
        );

        autoTable(doc, {
            head: headers,
            body: rows as (string | number)[][],
        });


        doc.save(`${title}.pdf`);
        toast.success("PDF exported!");
          onClose();
    };

    /** --- UI --- */
    return (
        <>
            <Toaster position="top-right" />
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4 sm:px-6">
                <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl text-center relative transform transition-all duration-300 scale-95 opacity-0 animate-modal-in">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 text-gray-400 bg-gray-300 rounded-full p-1 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Modal Title */}
                    <h2 className="text-lg font-semibold mb-4">{title}</h2>

                    {/* Export Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                exportExcel();
                               
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition"
                        >
                            Excel (.xlsx)
                        </button>

                        <button
                            onClick={() => {
                                exportCSV();
                               
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition"
                        >
                            CSV (.csv)
                        </button>

                        <button
                            onClick={() => {
                                exportPDF();
                              
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition"
                        >
                            PDF (.pdf)
                        </button>
                    </div>


                </div>
            </div>

            <style jsx>{`
        @keyframes modal-in {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        .animate-modal-in {
            animation: modal-in 0.25s forwards;
        }
    `}</style>
        </>

    );
}
