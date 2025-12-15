"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/Tablecomponents";

// Example Role type
type Role = {
  _id: string;            // <- required by DataTable
  name: string;
  description: string;
  status: "active" | "inactive";
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchRoles() {
      setLoading(true);
      // Replace with your API call
      const data: Role[] = [
        { _id: "1", name: "Superadmin", description: "Full access to everything", status: "active" },
        { _id: "2", name: "Admin", description: "Manage users and settings", status: "active" },
        { _id: "3", name: "User", description: "Limited access", status: "inactive" },
      ];

      setRoles(data);
      setTotalPages(1);
      setLoading(false);
    }
    fetchRoles();
  }, []);

  /** Table Columns */
  const columns = [
    { header: "Role", accessor: "name" },
    { header: "Description", accessor: "description" },
    { header: "Status", accessor: "status" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Roles</h1>
      </div>

      {/* Roles Table */}
      <DataTable
        columns={columns}
        data={roles}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
