"use client";

import { Eye, Copy, Check } from "lucide-react";
import { useState } from "react";
import Modal from "./Modal";

interface ViewDialogProps {
  open: boolean;
  title?: string;
  data: Record<string, any> | null;
  onClose: () => void;
  showCopyButton?: boolean;
}

export default function ViewDialog({
  open,
  title = "Details",
  data,
  onClose,
  showCopyButton = true,
}: ViewDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string" && value.trim() !== "") return value;
    if (typeof value === "boolean") return value ? "✓" : "✗";
    if (typeof value === "number") return value.toString();
    if (value instanceof Date) return value.toLocaleString();
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      return JSON.stringify(value);
    }
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return "—";
  };

  return (
    <Modal 
      open={open} 
      title={title} 
      onClose={onClose} 
      maxWidth="lg"
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Copy button */}
        {showCopyButton && (
          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Copy all</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Data grid - Responsive layout */}
        <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          {Object.entries(data).map(([key, value], index) => (
            <div 
              key={key}
              className={`
                flex flex-col sm:flex-row 
                ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'}
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
              `}
            >
              {/* Key */}
              <div className="sm:w-1/3 p-3 sm:p-4 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800">
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
              </div>

              {/* Value */}
              <div className="sm:w-2/3 p-3 sm:p-4">
                <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 break-words font-mono bg-white dark:bg-gray-900 rounded">
                  {formatValue(value)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {Object.keys(data).length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <Eye className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              No data available
            </p>
          </div>
        )}
      </div>

      {/* Footer with close button */}
      <div className="flex justify-end mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onClose}
          className="
            w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 
            bg-blue-600 hover:bg-blue-700 active:bg-blue-800 
            text-white text-sm sm:text-base font-medium 
            rounded-lg transition-colors 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
            dark:focus:ring-offset-gray-900
          "
        >
          Close
        </button>
      </div>
    </Modal>
  );
}