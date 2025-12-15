"use client";

import { useState, useEffect, useCallback } from "react";
;
import {
  MessageSquare,
  Mail,
  Phone,
  FileDown,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/Tablecomponents";
import { getpendingApplications, sendMail } from "@/app/lib/request/application";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { motion, AnimatePresence } from "framer-motion";
import ExportModal from "@/components/ExportModal";

interface Application {
  _id: string;
  instituteId: string;
  userId?: string;
  academicYear: string;
  applicantName: string;
  paymentStatus: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  applicationId: string;
  institute?: {
    _id: string;
    name: string;
    instituteId: string;
  };
  personalData: Record<string, any>;
}


export default function CommunicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [institutions, setInstitutions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [searchApplicationId, setSearchApplicationId] = useState("");
  const [searchApplicantName, setSearchApplicantName] = useState("");
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [emailSubject, setEmailSubject] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [open, setOpen] = useState(false);

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [modalType, setModalType] = useState<"mail" | "whatsapp" | "sms" | null>(
    null
  );
  const [messageText, setMessageText] = useState("");

  // 🔹 Fetch user permission
  useEffect(() => {
    const fetchPermissions = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setHasPermission(false);
        return;
      }

      try {
        const payload = token.split(".")[1];
        const decoded: any = JSON.parse(atob(payload));

        if (
          (decoded.role === "admin" || decoded.role === "user") &&
          decoded.instituteId
        ) {
          const data = await getaccesscontrol({
            role: decoded.role,
            instituteId: decoded.instituteId,
          });

          const applicationPermission = data.permissions?.find(
            (p: any) => p.moduleName === "Application"
          );

          if (
            applicationPermission &&
            (applicationPermission.view ||
              applicationPermission.create ||
              applicationPermission.edit ||
              applicationPermission.delete ||
              applicationPermission.filter ||
              applicationPermission.download)
          ) {
            setUserpermisssion(applicationPermission);
            setHasPermission(true);
          } else {
            setUserpermisssion(null);
            setHasPermission(false);
          }
        } else if (decoded.role === "superadmin") {
          setUserpermisssion("superadmin");
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error("Permission fetch failed:", error);
        setHasPermission(false);
      }
    };

    fetchPermissions();
  }, []);

  // 🔹 Fetch unpaid applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getpendingApplications({
        page: currentPage,
        limit,
        academicYear: selectedYear !== "all" ? selectedYear : undefined,
        instituteId:
          selectedInstitution !== "all" ? selectedInstitution : undefined,
        applicationId: searchApplicationId.trim() || undefined,
        applicantName: searchApplicantName.trim() || undefined,
      });

      // ✅ Correct access
      setApplications(res.applications.docs);
      setTotalPages(res.applications.totalPages);
    } catch (err: any) {
      toast.error("Failed to load applications");
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    selectedYear,
    selectedInstitution,
    limit,
    searchApplicationId,
    searchApplicantName,
  ]);




  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filteredApplications = (applications || []).map((app: any) => ({
    ApplicationId: app.applicationId || "-",
    Institute: app.institute?.name || app.instituteId || "-",
    ApplicantName: app.applicantName || app.personalData?.["Full Name"] || "-",
    Program: app.program || "-",
    AcademicYear: app.academicYear || "-",
    PaymentStatus: app.paymentStatus || "-",
    CreatedAt: app.createdAt
      ? new Date(app.createdAt).toLocaleDateString()
      : "-"
  }));

  // 🔹 Load Institutions
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const activeInstitutions = await getActiveInstitutions();
        setInstitutions(
          activeInstitutions.map((inst: any) => ({
            value: inst.instituteId,
            label: inst.name,
          }))
        );
      } catch (err) {
        toast.error("Failed to load institutions");
      }
    };
    loadInstitutions();
  }, []);

  // 🔹 Modal submit (send message)
  const handleSend = async () => {
    if (!selectedApp) return toast.error("No applicant selected");

    if (modalType === "mail") {
      if (!emailSubject.trim() || !messageText.trim()) {
        toast.error("Please enter both subject and message");
        return;
      }

      const toEmail = selectedApp.personalData?.["Email Address"];
      if (!toEmail) {
        toast.error("Applicant does not have a valid email address");
        return;
      }

      try {
        setIsSending(true);

        await sendMail({
          toEmail,
          toName: selectedApp.applicantName,
          subject: emailSubject,
          htmlContent: `<p>${messageText}</p>`,
        });

        toast.success("Email sent successfully!");
        setModalType(null);
        setEmailSubject("");
        setMessageText("");
      } catch (err: any) {
        console.error("Mail send failed:", err);
        toast.error(err.message || "Failed to send email");
      } finally {
        setIsSending(false);
      }

      return;
    }

    // 🟢 WhatsApp redirect for manual send
    if (modalType === "whatsapp") {
      const phone = selectedApp.personalData?.["Contact Number"];
      if (!phone) {
        toast.error("Applicant does not have a valid contact number");
        return;
      }

      const message = encodeURIComponent(messageText.trim());
      const whatsappURL = `https://wa.me/${phone}?text=${message}`;

      // Open WhatsApp chat in new tab
      window.open(whatsappURL, "_blank");

      toast.success("Opening WhatsApp...");
      setModalType(null);
      setMessageText("");
      return;
    }

    // 🟡 SMS or other types (dummy log)
    console.log(`📤 Sending ${modalType?.toUpperCase()} to:`, {
      applicant: selectedApp.applicantName,
      contact: selectedApp.personalData?.["Contact Number"],
      message: messageText,
    });

    toast.success(`${modalType?.toUpperCase()} sent successfully (console log)`);
    setModalType(null);
    setMessageText("");
  };



  // 🔹 Table Columns
  const columns = [
    { header: "Application ID", accessor: "applicationId" },
    {
      header: "Institute",
      render: (a: Application) => a.institute?.name || a.instituteId,
    },
    { header: "Applicant Name", accessor: "applicantName" },
    { header: "Academic Year", accessor: "academicYear" },
    {
      header: "Payment Status",
      render: (a: Application) => (
        <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-300 text-xs font-medium">
          {a.paymentStatus}
        </span>
      ),
    },
    {
      header: "Created At",
      render: (a: Application) => new Date(a.createdAt).toLocaleDateString(),
    },
    {
      header: "Actions",
      render: (a: Application) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedApp(a);
              setModalType("mail");
            }}
            className="p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition"
            title="Send Email"
          >
            <Mail className="w-4 h-4" />
          </button>


          <button
            onClick={() => {
              setSelectedApp(a);
              setModalType("whatsapp");
            }}
            className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition"
            title="Send WhatsApp"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 448 512"
              className="w-4 h-4 fill-current"
            >
              <path d="M380.9 97.1C339 55.2 283.2 32 223.9 32 106.1 32 10 128.1 10 245.9c0 43.4 11.4 85.7 33 122.8L0 480l115.2-42.1c35.2 19.2 74.7 29.2 115.8 29.2h.1c117.8 0 213.9-96.1 213.9-213.9 0-59.3-23.2-115.1-64.1-156.1zM223.9 438.8c-36.5 0-72.3-9.8-103.6-28.3l-7.4-4.4-68.4 25 25.4-66.6-4.8-7.6c-20.5-32.5-31.3-70.1-31.3-108.6 0-109.8 89.3-199.1 199.1-199.1 53.2 0 103.2 20.7 140.9 58.4 37.6 37.7 58.4 87.7 58.4 140.9 0 109.8-89.3 199.1-199.1 199.1zm121.9-148.5c-6.7-3.3-39.5-19.5-45.6-21.7-6.1-2.2-10.6-3.3-15.1 3.3-4.4 6.7-17.3 21.7-21.2 26.1-3.9 4.4-7.8 5-14.5 1.7-39.5-19.8-65.3-35.4-91.2-80.3-6.9-11.9 6.9-11.1 19.8-37 2.2-4.4 1.1-8.3-.6-11.6-1.7-3.3-15.1-36.3-20.7-49.8-5.5-13.3-11.1-11.4-15.1-11.6-3.9-.2-8.3-.2-12.8-.2s-11.6 1.7-17.7 8.3c-6.1 6.7-23.3 22.8-23.3 55.8s23.8 64.7 27.2 69.2c3.3 4.4 46.8 71.5 113.4 100.3 15.8 6.8 28.1 10.8 37.7 13.8 15.8 5 30.3 4.3 41.8 2.6 12.7-1.9 39.5-16.1 45.1-31.7 5.6-15.6 5.6-28.9 3.9-31.7-1.6-2.8-6.1-4.4-12.8-7.7z" />
            </svg>
          </button>



          <button
            onClick={() => {
              setSelectedApp(a);
              setModalType("sms");
            }}
            className="p-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition"
            title="Send SMS"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (!hasPermission)
    return (
      <div className="p-6 text-center text-red-600">
        You do not have permission to access this page.
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">

        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-semibold">communications</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">

          {(userpermission === "superadmin" || userpermission?.filter) && (
            <>
              <input
                type="text"
                placeholder="Search by Application ID"
                value={searchApplicationId}
                onChange={(e) => {
                  setSearchApplicationId(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />

              {/* Applicant Name Search */}
              <input
                type="text"
                placeholder="Search by Applicant "
                value={searchApplicantName}
                onChange={(e) => {
                  setSearchApplicantName(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />
              {/* Institution Filter */}
              {(userpermission === "superadmin" && <select
                value={selectedInstitution}
                onChange={(e) => {
                  setSelectedInstitution(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              >
                <option value="all">All Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.value} value={inst.value}>
                    {inst.label}
                  </option>
                ))}
              </select>)}



              {/* Academic Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              >
                <option value="all">All Years</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </>
          )}



          {(userpermission === "superadmin" || userpermission?.download) && (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-1 bg-green-700 hover:bg-green-800 text-white px-3 py-2 text-sm rounded-md w-full sm:w-auto transition"
            >
              <FileDown className="w-4 h-4" /> Export
            </button>)}




        </div>

        <ExportModal
          open={open}
          title={"Communications"}
          onClose={() => setOpen(false)}
          data={filteredApplications}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Modal for Mail/WhatsApp/SMS */}
      {modalType && (
        <AnimatePresence>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              key="modal"
              className="bg-white rounded-2xl p-6 w-96 space-y-4 shadow-2xl border border-gray-100"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {/* Title */}
              <h2 className="text-lg font-semibold text-gray-800 capitalize">
                Send {modalType} to{" "}
                <span className="text-blue-600 font-medium">
                  {selectedApp?.applicantName}
                </span>
              </h2>

              {/* Email subject (only for mail) */}
              {modalType === "mail" && (
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              )}

              {/* Message */}
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Type your ${modalType} message here...`}
                className="w-full border rounded-md p-2 text-sm min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition"
                >
                  Cancel
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={isSending}
                  className={`px-4 py-2 text-sm text-white rounded-md transition ${isSending
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {isSending ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 018 8h-4l3.5 3.5L20 12h-4a8 8 0 01-8 8v-4l-3.5 3.5L8 20v-4a8 8 0 01-4-4z"
                        ></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* 
      {loading && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
      )} */}
    </div>
  );
}
