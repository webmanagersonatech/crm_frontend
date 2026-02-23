"use client";
import { X, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";

interface ExportModalProps {
    open: boolean;
    onClose: () => void;
    data: Record<string, any>[];
    title?: string;
    loading?: boolean;
}

export default function ExportModal({
    open,
    onClose,
    data = [],
    title = "Export As",
    loading = false,
}: ExportModalProps) {
    if (!open) return null;

    /** --- Helper Functions --- */
    const handleEmptyData = () => {
        if (!data.length) {
            toast.error("No data to export!");
            return true;
        }
        return false;
    };

    const formatHeader = (header: string): string => {
        // Convert camelCase/PascalCase to readable format with spaces
        return header
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    };

    const truncateValue = (value: any, maxLength: number = 50): string => {
        const stringValue = String(value ?? '');
        if (stringValue.length > maxLength) {
            return stringValue.substring(0, maxLength) + '...';
        }
        return stringValue;
    };

    /** --- Export Handlers --- */
    const exportCSV = () => {
        if (handleEmptyData()) return;
        
        try {
            const headers = Object.keys(data[0]);
            const formattedHeaders = headers.map(formatHeader);
            
            // Process data for CSV with proper escaping
            const csvRows = data.map(row => {
                return headers.map(header => {
                    const value = row[header] ?? '';
                    // Escape quotes and wrap in quotes if contains comma or newline
                    const stringValue = String(value).replace(/"/g, '""');
                    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                        return `"${stringValue}"`;
                    }
                    return stringValue;
                }).join(',');
            });

            const csv = [formattedHeaders.join(','), ...csvRows].join('\n');

            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // Add BOM for UTF-8
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${title.replace(/\s+/g, '_')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("CSV exported successfully!");
            onClose();
        } catch (error) {
            toast.error("Error exporting CSV!");
            console.error(error);
        }
    };

    const exportExcel = () => {
        if (handleEmptyData()) return;
        
        try {
            // Format headers for better readability
            const formattedData = data.map(row => {
                const formattedRow: Record<string, any> = {};
                Object.keys(row).forEach(key => {
                    formattedRow[formatHeader(key)] = row[key];
                });
                return formattedRow;
            });

            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            
            // Auto-size columns (approximation)
            const colWidths: number[] = [];
            Object.keys(formattedData[0]).forEach((key, index) => {
                const maxLength = Math.max(
                    key.length,
                    ...formattedData.map(row => String(row[key] || '').length)
                );
                colWidths[index] = Math.min(maxLength, 50); // Cap at 50 characters
            });
            
            worksheet['!cols'] = colWidths.map(width => ({ wch: width + 2 }));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

            XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
            toast.success("Excel exported successfully!");
            onClose();
        } catch (error) {
            toast.error("Error exporting Excel!");
            console.error(error);
        }
    };

    const exportPDF = () => {
        if (handleEmptyData()) return;
        
        try {
            const doc = new jsPDF({
                orientation: data.length > 10 ? 'landscape' : 'portrait',
                unit: 'pt'
            });

            const headers = Object.keys(data[0]).map(formatHeader);
            
            // Process data for PDF with truncation for long values
            const rows = data.map(row => {
                return Object.values(row).map(value => {
                    const stringValue = String(value ?? '');
                    // Truncate very long values for PDF
                    return stringValue.length > 60 ? stringValue.substring(0, 60) + '...' : stringValue;
                });
            });

            // Calculate column widths based on content
            const columnStyles: Record<number, { cellWidth: number }> = {};
            headers.forEach((_, index) => {
                const maxLength = Math.max(
                    headers[index].length,
                    ...rows.map(row => String(row[index] || '').length)
                );
                // Set width based on content (min: 40, max: 200)
                const width = Math.min(Math.max(maxLength * 6, 40), 200);
                columnStyles[index] = { cellWidth: width };
            });

            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: 20,
                margin: { top: 20, bottom: 20, left: 20, right: 20 },
                styles: {
                    fontSize: 8,
                    cellPadding: 4,
                    overflow: 'linebreak',
                    cellWidth: 'auto'
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: columnStyles,
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                didDrawPage: (data) => {
                    // Add page number
                    const pageCount = doc.getNumberOfPages();
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        doc.setFontSize(8);
                        doc.text(
                            `Page ${i} of ${pageCount}`,
                            doc.internal.pageSize.width / 2,
                            doc.internal.pageSize.height - 10,
                            { align: 'center' }
                        );
                    }
                }
            });

            doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
            toast.success("PDF exported successfully!");
            onClose();
        } catch (error) {
            toast.error("Error exporting PDF!");
            console.error(error);
        }
    };

    /** --- UI --- */
    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-4 sm:px-6">
                <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md sm:max-w-lg md:max-w-xl text-center relative transform transition-all duration-300 scale-95 opacity-0 animate-modal-in">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 text-gray-400 bg-gray-300 rounded-full p-1 hover:text-gray-600 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Modal Title */}
                    <h2 className="text-lg font-semibold mb-4">{title}</h2>
                    
                    {loading && (
                        <div className="absolute inset-0 bg-white bg-opacity-80 rounded-xl flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                <p className="text-sm text-gray-600">Preparing data...</p>
                            </div>
                        </div>
                    )}

                    {/* Data Preview Info */}
                    {data.length > 0 && (
                        <div className="mb-4 text-left bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">{data.length}</span> records available for export
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Columns: {Object.keys(data[0]).map(formatHeader).join(', ')}
                            </p>
                        </div>
                    )}

                    {/* Export Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={exportExcel}
                            disabled={loading || data.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span>Excel (.xlsx)</span>
                            <span className="text-xs bg-green-700 px-2 py-0.5 rounded">Formatted</span>
                        </button>

                        <button
                            onClick={exportCSV}
                            disabled={loading || data.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span>CSV (.csv)</span>
                            <span className="text-xs bg-blue-700 px-2 py-0.5 rounded">UTF-8</span>
                        </button>

                        <button
                            onClick={exportPDF}
                            disabled={loading || data.length === 0}
                            className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span>PDF (.pdf)</span>
                            <span className="text-xs bg-red-700 px-2 py-0.5 rounded">Auto Layout</span>
                        </button>
                    </div>

                    {/* Close Button at Bottom (Optional) */}
                    <button
                        onClick={onClose}
                        className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
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