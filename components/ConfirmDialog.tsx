"use client";

import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  extraInput?: any;
}

export default function ConfirmDialog({
  open,
  title = "Confirm Action",
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  extraInput,

}: ConfirmDialogProps) {
  return (
    <Modal open={open} title="" onClose={onCancel}>
      <div className="relative p-6">

        {/* Red Tick Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full 
                    bg-red-100 border border-red-300 shadow-md">
          <svg
            className="w-7 h-7 text-red-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h2>

        {/* Message */}
        <p className="text-center text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-4 mt-4">
        
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-gray-400 text-gray-700 
          dark:border-gray-600 dark:text-gray-300 
          hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            {cancelLabel}
          </button>

          {/* Confirm (Royal Red) */}
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 
          text-white shadow-lg hover:from-red-700 hover:to-red-800 
          transition-all scale-100 hover:scale-105"
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </Modal>


  );
}
