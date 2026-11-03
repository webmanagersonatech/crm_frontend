"use client";

import { useEffect, useState } from "react";
import { BarChart3, FileText, Users, GraduationCap } from "lucide-react";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import ApplicationsPage from "../applications/page";
import StudentsPage from "../students/page";
import LeadsPage from "../leads/page";

type TabKey = "application" | "lead" | "student";

export default function ReportsPage() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [userpermisssion, setUserpermisssion] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("application");

  useEffect(() => {
    const fetchPermissions = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        console.log("No token found, skipping API call");
        setHasPermission(false);
        return;
      }

      try {
        const payload = token.split(".")[1];
        const decoded: any = JSON.parse(atob(payload));

        if (
          (decoded.role === "admin" || decoded.role === "user") &&
          decoded.instituteId &&
          decoded.id
        ) {
          const data = await getaccesscontrol({
            userId: decoded.id,
            instituteId: decoded.instituteId,
          });

          const reportPermission = data.permissions?.find(
            (p: any) => p.moduleName === "Reports"
          );

          if (
            reportPermission &&
            (reportPermission.view ||
              reportPermission.create ||
              reportPermission.edit ||
              reportPermission.delete ||
              reportPermission.filter ||
              reportPermission.download)
          ) {
            setUserpermisssion(reportPermission);
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
        console.error("Failed to decode token or fetch permissions:", error);
        setHasPermission(false);
      }
    };

    fetchPermissions();
  }, []);

  // Dynamic header icon
  const ReportIcon =
    activeTab === "application"
      ? FileText
      : activeTab === "lead"
      ? Users
      : activeTab === "student"
      ? GraduationCap
      : BarChart3;

  // Show loading state while permission is being checked
  if (hasPermission === null) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  if (!hasPermission) {
    return (
      <div className="p-6 text-center text-red-600">
        You do not have permission to access this page. Please contact your
        superadmin.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <ReportIcon className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
          {activeTab === "application"
            ? "Application Reports"
            : activeTab === "student"
            ? "Student Reports"
            : "Lead Reports"}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("application")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
            activeTab === "application"
              ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <FileText className="w-4 h-4 mr-2" /> Application Report
        </button>

        <button
          onClick={() => setActiveTab("lead")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
            activeTab === "lead"
              ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Users className="w-4 h-4 mr-2" /> Lead Report
        </button>

        <button
          onClick={() => setActiveTab("student")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
            activeTab === "student"
              ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <GraduationCap className="w-4 h-4 mr-2" />
          Student Report
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        {activeTab === "application" && <ApplicationsPage />}
        {activeTab === "lead" && <LeadsPage />}
        {activeTab === "student" && <StudentsPage />}
      </div>
    </div>
  );
}