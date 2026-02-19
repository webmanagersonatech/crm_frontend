"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getLeadById } from "@/app/lib/request/leadRequest";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import BackButton from "@/components/BackButton";
// Icons
import { FaWhatsapp, FaRegClock, FaEdit, FaPhone, FaGlobe, FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";
import { MdOfflineBolt } from "react-icons/md";


const COMMUNICATION_TYPES = [
    { label: "WhatsApp", color: "bg-green-500 text-white", border: "border-green-500", icon: <FaWhatsapp /> },
    { label: "Offline", color: "bg-gray-500 text-white", border: "border-gray-500", icon: <MdOfflineBolt /> },
    { label: "Online", color: "bg-blue-400 text-white", border: "border-blue-400", icon: <FaGlobe /> },
    { label: "Phone", color: "bg-blue-600 text-white", border: "border-blue-600", icon: <FaPhone /> },
    {
        label: "Social Media", color: "bg-purple-500 text-white", border: "border-purple-500", icon: (
            <div className="flex gap-1 justify-center">
                <FaFacebook />
                <FaInstagram />
                <FaTwitter />
            </div>
        )
    },
];

export default function ApplicationDetailsPage() {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeComm, setActiveComm] = useState<string>("All");

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            setIsLoading(true);
            try {
                const res = await getLeadById(id as string);
                setData(res);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);

    const followups = data?.followups || [];

    const grouped = useMemo(() => {
        const map: Record<string, any[]> = {};
        followups.forEach((f: any) => {
            if (!map[f.communication]) map[f.communication] = [];
            map[f.communication].push(f);
        });
        return map;
    }, [followups]);

    const filteredFollowups =
        activeComm === "All"
            ? followups
            : grouped[activeComm] || [];

    if (isLoading) return <Spinner />;
    if (!data) return null;

    return (
        <div className="p-6 space-y-6">
            <BackButton />
            {/* ===== Lead Details Card ===== */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                <h1 className="text-2xl font-semibold text-gray-800">{data.candidateName}</h1>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-gray-600">
                    <div><span className="font-medium">program:</span> {data.program.toUpperCase()}</div>
                    <div><span className="font-medium">phoneNumber:</span> {data.phoneNumber}</div>
                    <div><span className="font-medium">UG Degree:</span> {data.ugDegree}</div>
                    <div><span className="font-medium">DOB:</span> {new Date(data.dateOfBirth).toLocaleDateString()}</div>
                    <div><span className="font-medium">Country:</span> {data.country}</div>
                    <div><span className="font-medium">State:</span> {data.state}</div>
                    <div><span className="font-medium">City:</span> {data.city}</div>
                    <div><span className="font-medium">Status:</span> {data.status}</div>
                    <div><span className="font-medium">Lead ID:</span> {data.leadId}</div>
                    <div><span className="font-medium">Created By:</span> {data.creator?.firstname} {data.creator?.lastname}</div>
                    <div><span className="font-medium">Created At:</span> {new Date(data.createdAt).toLocaleString()}</div>
                    <div><span className="font-medium">Updated At:</span> {new Date(data.updatedAt).toLocaleString()}</div>
                </div>
            </div>

            {/* ===== Communication Filter ===== */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                <CommCard
                    label="All"
                    count={followups.length}
                    active={activeComm === "All"}
                    onClick={() => setActiveComm("All")}
                />

                {COMMUNICATION_TYPES.map((type) => (
                    <CommCard
                        key={type.label}
                        label={type.label}
                        count={grouped[type.label]?.length || 0}
                        active={activeComm === type.label}
                        onClick={() => setActiveComm(type.label)}
                        color={type.color}
                        border={type.border}
                        icon={type.icon}
                    />
                ))}
            </div>

            {/* ===== Followups List ===== */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-lg text-gray-700">
                        Follow Ups ({filteredFollowups.length})
                    </h2>

                    {/* Update Lead Button */}

                    <Link
                        href={`/leads/editlead/${data._id}`} // pass the lead ID in URL
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                        <FaEdit className="text-sm" />
                        Update Followups
                    </Link>
                </div>
                {filteredFollowups.length === 0 ? (
                    <p className="text-gray-500 text-sm">No followups found</p>
                ) : (
                    <div className="
    grid gap-6
    grid-cols-1
    sm:grid-cols-2
    md:grid-cols-3
    lg:grid-cols-4
  ">
                        {filteredFollowups.map((f: any) => (
                            <div
                                key={f._id}
                                className="relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-200"
                            >
                                {/* Timeline Icon */}
                                <div className="absolute -top-3 left-5 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs shadow-md">
                                    <FaRegClock />
                                </div>

                                {/* Header */}
                                <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-500">Status</span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                            {f.status}
                                        </span>
                                    </div>

                                    <div className="text-sm text-gray-500">
                                        Follow-up :
                                        <span className="ml-1 font-semibold text-gray-800">
                                            {f.followUpDate
                                                ? new Date(f.followUpDate).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })
                                                : "—"}
                                        </span>
                                    </div>

                                </div>

                                {/* Content */}
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium text-gray-900">Description :</span>{" "}
                                        {f.description}
                                    </p>

                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium text-gray-900">Call Taken :</span>{" "}
                                        {f.calltaken}
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                    <span>
                                        Created :
                                        <span className="ml-1 font-medium text-gray-800">
                                            {new Date(f.createdAt).toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </span>

                                    <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                                        {getIcon(f.communication)}
                                        {f.communication}
                                    </span>
                                </div>
                            </div>
                        ))}

                    </div>
                )}

            </div>
        </div>
    );
}

/* ===== Communication Card ===== */
function CommCard({
    label,
    count,
    active,
    onClick,
    color = "bg-white text-gray-700",
    border = "border-gray-300",
    icon,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    color?: string;
    border?: string;
    icon?: React.ReactNode;
}) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-center transition 
        ${active ? color : "bg-white text-gray-700"} 
        ${active ? "" : border} hover:scale-105 hover:shadow-md flex flex-col items-center gap-0.5`}
        >
            <div className="text-lg">{icon}</div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xl font-bold">{count}</div>
        </div>
    );
}


/* ===== Helper: Get Icon for followup ===== */
function getIcon(comm: string) {
    switch (comm) {
        case "WhatsApp":
            return <FaWhatsapp className="text-green-500" />;
        case "Phone":
            return <FaPhone className="text-blue-600" />;
        case "Social Media":
            return (
                <div className="flex gap-1 text-purple-500">
                    <FaFacebook />
                    <FaInstagram />
                    <FaTwitter />
                </div>
            );
        case "Online":
            return <FaGlobe className="text-blue-400" />;
        case "Offline":
            return <MdOfflineBolt className="text-gray-500" />;
        default:
            return <FaGlobe className="text-gray-400" />;
    }
}

