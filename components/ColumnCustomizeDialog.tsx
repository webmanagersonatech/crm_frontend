"use client";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ColumnCustomizeProps {
  open: boolean;
  title?: string;
  columns: { key: string; label: string }[];
  selected: Record<string, boolean>;
  onChange: (updated: Record<string, boolean>) => void;
  onClose: () => void;
}

export default function ColumnCustomizeDialog({
  open,
  title = "Customize Columns",
  columns,
  selected,
  onChange,
  onClose,
}: ColumnCustomizeProps) {
  const toggleColumn = (key: string) => {
    onChange({
      ...selected,
      [key]: !selected[key],
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative bg-white rounded-md p-6 w-80 shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* X Close Icon */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <h2 className="text-xl font-semibold mb-4">{title}</h2>

            {/* Column List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {columns.map((col) => (
                <label key={col.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected[col.key]}
                    onChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
