"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getOtherById } from "@/app/lib/request/othersRequest";
import Spinner from "@/components/Spinner";
import BackButton from "@/components/BackButton";

export default function OthersDetailsPage() {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"same" | "all">("same");
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);


    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const payload: any = JSON.parse(atob(token.split(".")[1]));

            if (payload.role === "superadmin") {
                setIsSuperAdmin(true);
            }
        } catch (e) {
            console.error(e);
        }
    }, []);


    useEffect(() => {
        if (!id) return;

        const load = async () => {
            try {
                setLoading(true);
                const res = await getOtherById(id as string);
                setData(res);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);

    if (loading) return <Spinner />;
    if (!data) return null;

    const { main, relatedParticularInstituteSources, relatedOverallInstituteSources } = data;

    const sources =
        activeTab === "same"
            ? relatedParticularInstituteSources
            : relatedOverallInstituteSources;

    return (
        <div className="min-h-screen bg-[#f4f6fb] px-4 sm:px-6 lg:px-10 py-4 sm:py-6 space-y-6">

            <BackButton />

            {/* ================= HEADER ================= */}
            <div className="bg-white rounded-xl shadow-sm border p-5 sm:p-6 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
                        {main.name}
                    </h1>
                    <p className="text-sm text-gray-500">{main.phone}</p>
                    <p className="text-xs text-gray-400 mt-1">Record ID: {main.recordId}</p>
                </div>

                <div className="flex sm:flex-col gap-2 sm:items-end">
                    <span className="text-xs text-gray-500">Lead Status</span>
                    <span
                        className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold
              ${main.leadId ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}
            `}
                    >
                        {main.leadId ? "Converted Lead" : "Raw Lead"}
                    </span>
                </div>
            </div>

            {/* ================= MAIN GRID ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-5 sm:p-6">
                    <h2 className="text-lg font-semibold mb-4">Information</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        <Info label="Institute" value={main?.institute?.name} />
                        <Info label="Data Source" value={main.dataSource} />
                        <Info label="Date" value={main.date} />
                        <Info label="Created At" value={new Date(main.createdAt).toLocaleDateString()} />
                        <Info label="Updated At" value={new Date(main.updatedAt).toLocaleDateString()} />
                    </div>
                </div>

                {/* RIGHT */}
                <div className="bg-white rounded-xl shadow-sm border p-5 sm:p-6">
                    <h2 className="text-lg font-semibold mb-4">Additional Details</h2>

                    <div className="space-y-3 max-h-[300px] overflow-auto pr-2">
                        {Object.entries(main.extraFields || {}).map(([k, v]: any) => (
                            <div key={k} className="flex justify-between border-b pb-2 text-sm">
                                <span className="text-gray-500">{k}</span>
                                <span className="font-medium text-gray-900 break-words text-right">
                                    {v || "-"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* ================= SOURCE HISTORY ================= */}
            <div className="bg-white rounded-xl shadow-sm border">

                <div className="p-5 sm:p-6 border-b flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Source History</h2>
                        <p className="text-sm text-gray-500">Where this student was captured</p>
                    </div>

                    <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-lg">
                        <button
                            onClick={() => setActiveTab("same")}
                            className={`px-4 py-2 rounded-full text-sm font-semibold
                ${activeTab === "same"
                                    ? "bg-gradient-to-r from-[#3a4480] to-[#3d4f91] text-white shadow"
                                    : "text-slate-600 hover:text-slate-900"
                                }
              `}
                        >
                            Same Institute ({relatedParticularInstituteSources.length})
                        </button>

                        {isSuperAdmin && (
                            <button
                                onClick={() => setActiveTab("all")}
                                className={`px-4 py-2 rounded-full text-sm font-semibold
      ${activeTab === "all"
                                        ? "bg-gradient-to-r from-[#3a4480] to-[#3d4f91] text-white shadow"
                                        : "text-slate-600 hover:text-slate-900"
                                    }
    `}
                            >
                                All Institutes ({relatedOverallInstituteSources.length})
                            </button>
                        )}

                    </div>
                </div>

                {sources.length > 0 ? (
                    <div>
                        {sources.map((s: any, i: number) => (
                            <div
                                key={i}
                                className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 border-b hover:bg-gray-50"
                            >
                                <Info label="Source" value={s.dataSource} />
                                <Info label="Name" value={s.name} />
                                <Info label="Record ID" value={s.recordId} />
                                <Info label="Institute" value={s.institute} />
                                <Info label="Created" value={new Date(s.createdAt).toLocaleDateString()} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 text-center text-gray-500">No records found</div>
                )}
            </div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: any }) {
    return (
        <div>
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="text-sm font-medium text-gray-900 break-words">{value || "-"}</p>
        </div>
    );
}
