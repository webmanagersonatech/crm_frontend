"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
interface Sibling {
    _id: string;
    name: string;
    age: number;
    status: string;
}

interface Institute {
    _id: string;
    name: string;
}

interface Application {
    _id: string;
    applicationId: string;
}

interface Student {
    _id: string;
    studentId: string;
    firstname: string;
    lastname: string;
    email: string;
    mobileNo: string;
    institute?: Institute;
    academicYear: string;
    status: "active" | "inactive";
    siblingsDetails?: Sibling[];
    application?: Application;
    feedbackReason?: string;
    internshipCompany?: string;
    internshipDuration?: string;
    internshipType?: string;
    studentImage?: string
    [key: string]: any; // other fields
}

interface StudentViewDialogProps {
    open: boolean;
    title: string;
    data: any; // null-safe
    onClose: () => void;
}

export default function StudentViewDialog({
    open,
    title,
    data,
    onClose,
}: StudentViewDialogProps) {
    // Base URL for images - change this to your server URL
    const BASE_URL = "http://160.187.54.80:5000/uploads/";

    // Function to get full image URL
    const getImageUrl = () => {
        if (data?.studentImage) {
            return `${BASE_URL}${data.studentImage}`;
        }
        return null;
    };

    const imageUrl = getImageUrl();

    return (
        <AnimatePresence>
            {open && data && (
                <>
                    {/* Overlay */}
                    <motion.div
                        className="fixed inset-0 bg-black/40 z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 relative">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>

                            {/* Modal Title */}
                            <h2 className="text-2xl font-semibold mb-4">{title}</h2>
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={`${data.firstname} ${data.lastname}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // Fallback if image fails to load
                                                e.currentTarget.style.display = 'none';
                                                const parent = e.currentTarget.parentElement;
                                                if (parent) {
                                                    const fallbackDiv = document.createElement('div');
                                                    fallbackDiv.className = 'w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold';
                                                    fallbackDiv.innerText = data.firstname?.charAt(0).toUpperCase() || 'S';
                                                    parent.appendChild(fallbackDiv);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">
                                            {data.firstname?.charAt(0).toUpperCase() || 'S'}
                                        </div>
                                    )}
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    {data.studentImage ? 'Student Photo' : 'No Photo Available'}
                                </p>

                            </div>
                            {/* Student Info */}
                            {/* Student Info */}
                            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                <p><strong>Student ID:</strong> {data.studentId}</p>
                                <p><strong>Name:</strong> {data.firstname} {data.lastname}</p>
                                <p><strong>Email:</strong> {data.email}</p>
                                <p><strong>Mobile:</strong> {data.mobileNo}</p>
                                <p><strong>Academic Year:</strong> {data.academicYear}</p>
                                <p>
                                    <strong>Status:</strong>{" "}
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${data.status === "active"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                            }`}
                                    >
                                        {data.status}
                                    </span>
                                </p>

                                {/* Blood Group */}
                                {/* Blood Group & Blood Donation Willingness */}
                                {data.bloodGroup && (
                                    <p className="flex items-center gap-2">
                                        <strong>Blood Group:</strong>
                                        <span className="inline-block px-2 py-1 text-white font-semibold rounded-full bg-red-500">
                                            {data.bloodGroup}
                                        </span>
                                        {data.bloodWilling !== undefined && (
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${data.bloodWilling
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {data.bloodWilling ? "Willing to Donate" : "Not Willing"}
                                            </span>
                                        )}
                                    </p>
                                )
                                }


                                {/* Hostel Willingness */}
                                <p>
                                    <strong>Hostel Willingness:</strong> {data.hostelWilling ? "Yes" : "No"}
                                    {data.hostelReason && ` - Reason: ${data.hostelReason}`}
                                </p>

                                {/* Admission Quota */}
                                {data.admissionQuota && (
                                    <p><strong>Admission Quota:</strong> {data.admissionQuota}</p>
                                )}

                                {/* Family Occupation */}
                                {(data.familyOccupation || data.familyOtherOccupation) && (
                                    <p>
                                        <strong>Family Occupation:</strong> {data.familyOccupation || data.familyOtherOccupation}
                                    </p>
                                )}

                                {/* Siblings */}
                                {data.siblingsDetails?.length ? (
                                    <div>
                                        <strong>Siblings:</strong>
                                        <ul className="ml-4 list-disc">
                                            {data.siblingsDetails.map((sibling: any) => (
                                                <li key={sibling._id}>
                                                    {sibling.name} - {sibling.age} - {sibling.status}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                {/* Feedback */}
                                {data.feedbackReason && (
                                    <p><strong>Feedback:</strong> {data.feedbackReason}</p>
                                )}

                                {/* Internship */}
                                {data.internshipCompany && (
                                    <p>
                                        <strong>Internship:</strong> {data.internshipCompany} - {data.internshipDuration} ({data.internshipType})
                                    </p>
                                )}

                                {/* View Application Button */}
                                <div className="flex justify-center mt-4">
                                    <div className="flex justify-center mt-6">
                                        {data.applicationId && (
                                            <div className="flex flex-col items-center gap-3 bg-red-50 p-4 rounded-lg border border-red-200 w-full max-w-md">
                                                {/* Note first */}
                                                <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                                                    <span className="text-xl">📋</span>
                                                    Want to see more details of this student?
                                                </p>

                                                {/* Red Button */}
                                                <Link
                                                    href={`/applications/${data?.application?._id}`}
                                                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md transition-all"
                                                >
                                                    <span>CLICK TO VIEW APPLICATION</span>
                                                    <span className="text-lg">→</span>
                                                </Link>

                                                {/* Small helper text */}
                                                <p className="text-xs text-gray-500">
                                                    (View full application details of this student)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
