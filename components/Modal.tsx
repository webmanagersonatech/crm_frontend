"use client";

import { X } from "lucide-react";
import React from "react";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full ${maxWidth} shadow-lg relative`}
      >
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
