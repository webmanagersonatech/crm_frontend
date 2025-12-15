"use client";

import { useState, useRef, useEffect } from "react";
import { FileDown, ChevronDown, Eye, X } from "lucide-react";
import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Select from "react-select";

export default function OthersPage() {
  const [events] = useState([
    {
      id: 1,
      name: "Arul Arul",
      mobile: "995270376",
      email: "arul62123@gmail.com",
      location: "Theni",
      eventName: "Coaching Class TANCET/MAT 2025",
      enrolledDate: "15-02-2025 05:42 AM",
      institution: "Sona School of Business and Management",
      dob: "06-01-2005",
      yearOfPassing: "2023",
    },
    {
      id: 2,
      name: "Sivagirl",
      mobile: "7010993315",
      email: "webdeveloper2@sonatech.ac.in",
      location: "-",
      eventName: "NEET Model Exam 2025",
      enrolledDate: "28-04-2025 01:45 PM",
      institution: "Sona Valliappa Public School",
      dob: "12-02-2006",
      yearOfPassing: "2024",
    },
  ]);

  // Filters
  const [eventFilter, setEventFilter] = useState({
    value: "all",
    label: "All",
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [institute, setInstitute] = useState({
    value: "all",
    label: "All Institutes",
  });

  // Modal state
  const [selectedEvent, setSelectedEvent] = useState<null | (typeof events)[0]>(
    null
  );

  // Export functions
  const exportCSV = () => {
    const header = [
      "S.No",
      "Name",
      "Mobile No",
      "Email",
      "Location",
      "Event Name",
      "Enrolled Date",
      "Institution",
    ];
    const rows = filteredEvents.map((e, i) => [
      i + 1,
      e.name,
      e.mobile,
      e.email,
      e.location,
      e.eventName,
      e.enrolledDate,
      e.institution,
    ]);
    const csvContent = [header, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "events.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    const worksheet = utils.json_to_sheet(filteredEvents);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Events");
    writeFile(workbook, "events.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Events List", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [
        [
          "S.No",
          "Name",
          "Mobile No",
          "Email",
          "Location",
          "Event Name",
          "Enrolled Date",
          "Institution",
        ],
      ],
      body: filteredEvents.map((e, i) => [
        i + 1,
        e.name,
        e.mobile,
        e.email,
        e.location,
        e.eventName,
        e.enrolledDate,
        e.institution,
      ]),
    });
    doc.save("events.pdf");
  };

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  // Filtered events
  const filteredEvents = events.filter((e) => {
    // Event filter
    const matchesEvent =
      eventFilter.value === "all" ||
      (eventFilter.value === "tancet" && e.eventName.includes("TANCET")) ||
      (eventFilter.value === "neet" && e.eventName.includes("NEET"));

    // Institute filter
    const matchesInstitute =
      institute.value === "all" || e.institution === institute.label;

    // Date filter
    const eventDateParts = e.enrolledDate.split(" ")[0].split("-");
    const eventDate = new Date(
      `${eventDateParts[2]}-${eventDateParts[1]}-${eventDateParts[0]}`
    );
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const matchesStart = !start || eventDate >= start;
    const matchesEnd = !end || eventDate <= end;

    return matchesEvent && matchesInstitute && matchesStart && matchesEnd;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
          Others
        </h1>
        <div className="flex gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 px-3 py-2 text-sm rounded-md shadow-md"
            >
              <FileDown className="w-4 h-4" /> Export{" "}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <div className="absolute mt-2 bg-white dark:bg-neutral-800 shadow-lg rounded-md border border-gray-200 dark:border-neutral-700 z-10 min-w-full sm:min-w-[180px] w-full sm:w-44 left-0 sm:right-0">
                <button
                  onClick={() => {
                    exportCSV();
                    setShowExportMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-100 text-blue-600 dark:hover:bg-blue-900 dark:text-blue-400"
                >
                  CSV
                </button>
                <button
                  onClick={() => {
                    exportExcel();
                    setShowExportMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-green-100 text-green-600 dark:hover:bg-green-900 dark:text-green-400"
                >
                  Excel
                </button>
                <button
                  onClick={() => {
                    exportPDF();
                    setShowExportMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-red-100 text-red-600 dark:hover:bg-red-900 dark:text-red-400"
                >
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow border border-gray-200 dark:border-neutral-800 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">Data Source</label>
          <Select
            className="w-48 text-sm"
            value={eventFilter}
            onChange={(option) => setEventFilter(option!)}
            options={[
              { value: "all", label: "All" },
              { value: "tancet", label: "TANCET/MAT" },
              { value: "neet", label: "NEET Model Exam" },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2 rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2 rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Select Institute</label>
          <Select
            className="w-60 text-sm"
            value={institute}
            onChange={(option) => setInstitute(option!)}
            options={[
              { value: "all", label: "All Institutes" },
              {
                value: "sona_biz",
                label: "Sona School of Business and Management",
              },
              { value: "sona_pub", label: "Sona Valliappa Public School" },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow border border-gray-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              <tr>
                <th className="px-4 py-2">S.No</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Mobile No</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Event Name</th>
                <th className="px-4 py-2">Enrolled Date</th>
                <th className="px-4 py-2">Institution</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((e, idx) => (
                <tr
                  key={e.id}
                  className="border-b border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2">{e.mobile}</td>
                  <td className="px-4 py-2">{e.email}</td>
                  <td className="px-4 py-2">{e.location}</td>
                  <td className="px-4 py-2">{e.eventName}</td>
                  <td className="px-4 py-2">{e.enrolledDate}</td>
                  <td className="px-4 py-2">{e.institution}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => setSelectedEvent(e)}
                      className="text-blue-600 hover:text-blue-800"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-gray-500">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Events Enrolled
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-medium">Event Name:</span>{" "}
                {selectedEvent.eventName}
              </p>
              <p>
                <span className="font-medium">Enrolled Date:</span>{" "}
                {selectedEvent.enrolledDate}
              </p>
              <p>
                <span className="font-medium">DOB:</span> {selectedEvent.dob}
              </p>
              <p>
                <span className="font-medium">Year of Passing:</span>{" "}
                {selectedEvent.yearOfPassing}
              </p>
              <p>
                <span className="font-medium">Institution:</span>{" "}
                {selectedEvent.institution}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
