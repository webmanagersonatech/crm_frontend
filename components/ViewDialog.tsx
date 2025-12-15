"use client";

import Modal from "./Modal";

interface ViewDialogProps {
  open: boolean;
  title?: string;
  data: Record<string, any> | null;
  onClose: () => void;
}

export default function ViewDialog({
  open,
  title = "Details",
  data,
  onClose,
}: ViewDialogProps) {
  if (!data) return null;

  return (
    <Modal open={open} title={title} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-2 text-sm text-gray-800 dark:text-gray-300">
        {Object.entries(data).map(([key, value]) => (
          <p key={key}>
            <strong className="capitalize">{key.replace(/([A-Z])/g, " $1")}:</strong>{" "}
            {typeof value === "string" && value.trim() !== ""
              ? value
              : value === null || value === undefined
              ? "—"
              : JSON.stringify(value)}
          </p>
        ))}
      </div>

      <div className="flex justify-end mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
