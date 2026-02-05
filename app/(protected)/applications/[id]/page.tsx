"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";

import { getApplicationById } from "@/app/lib/request/application";
import BackButton from "@/components/BackButton";
import Spinner from "@/components/Spinner";

export default function ApplicationDetailsPage() {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: "Application Form",
    });

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            setIsLoading(true);
            try {
                const res = await getApplicationById(id as string);
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [id]);

    if (isLoading) return <Spinner />;

    // const BASE_URL = "http://localhost:4000/uploads/";
    const BASE_URL = "http://160.187.54.80:5000/uploads/";

    const renderSubSections = (sections: any[]) =>
        sections.map((section: any) => (
            <div key={section.sectionName} className="mb-6 border rounded-md overflow-hidden">
                {/* BLUE HEADER */}
                <div className="bg-blue-700 text-white px-4 py-2 font-semibold">
                    {section.sectionName}
                </div>

                {/* CONTENT */}
                <div className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm print:grid-cols-3 print:gap-2">
                        {Object.entries(section.fields as Record<string, any>).map(([key, rawValue]) => {
                            let value = rawValue;

                            if (Array.isArray(value)) {
                                value = value.join(", ");
                            }

                            const isImage =
                                typeof value === "string" &&
                                /\.(png|jpe?g|webp|gif)$/i.test(value);

                            const isDocument =
                                typeof value === "string" &&
                                /\.(pdf|doc|docx|xls|xlsx)$/i.test(value);

                            return (
                                <div key={key} className="flex gap-1 break-inside-avoid">
                                    {/* LABEL */}
                                    <span className="font-semibold text-gray-800">
                                        {key.replace(/_/g, " ")} :
                                    </span>

                                    {/* VALUE */}
                                    <span className="text-gray-700">
                                        {isImage ? (
                                            <img
                                                src={`${BASE_URL}${value}`}
                                                alt={key}
                                                className="mt-1 max-h-[60px] max-w-[60px] object-contain border"
                                            />
                                        ) : isDocument ? (
                                            <a
                                                href={`${BASE_URL}${value}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 underline break-all"
                                            >
                                                {value}
                                            </a>
                                        ) : value !== undefined && value !== null && value !== "" ? (
                                            String(value)
                                        ) : (
                                            "nil"
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        ));

    return (
        <div className="p-6">
            {/* ACTION BAR */}
            <div className="flex justify-between items-center mb-4 no-print">
                <BackButton />
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded-md"
                >
                    <Printer size={18} />
                    Print
                </button>
            </div>

            {/* PRINT AREA */}
            <div
                ref={printRef}
                className="a4-page bg-white shadow-xl rounded-lg p-10 border border-gray-300"
            >
                {/* HEADER */}
                <div className="flex items-center justify-between mb-6">
                    <img
                        src={data?.instituteLogo || "/logo.png"}
                        alt="Logo"
                        className="w-20 h-20 object-contain"
                    />

                    <h1 className="text-xl font-bold text-center flex-1">
                        APPLICATION FORM
                    </h1>

                    <div className="text-right text-sm text-gray-600">
                        Application ID
                        <div className="font-semibold">{data?.applicationId || "-"}</div>
                    </div>
                </div>

                {/* PERSONAL DETAILS */}
                <section className="mb-6">
                    <h2 className="section-title">PERSONAL DETAILS</h2>
                    {renderSubSections(data?.personalDetails || [])}
                </section>

                {/* EDUCATION DETAILS */}
                <section className="mb-6">
                    <h2 className="section-title">EDUCATION DETAILS</h2>
                    {renderSubSections(data?.educationDetails || [])}
                </section>

                {/* PROGRAM DETAILS */}
                <section className="mb-8 border rounded-md overflow-hidden">
                    <div className="bg-blue-700 text-white px-4 py-2 font-semibold">
                        Program Details
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm print:grid-cols-3 print:gap-2">
                            <div className="flex gap-1">
                                <span className="font-semibold text-gray-800">Program Applied For :</span>
                                <span className="text-gray-700">{data?.program || "nil"}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-semibold text-gray-800">Academic Year :</span>
                                <span className="text-gray-700">{data?.academicYear || "nil"}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-semibold text-gray-800">Payment Status :</span>
                                <span className="text-gray-700">{data?.paymentStatus || "nil"}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SIGNATURES */}
                <div className="mt-16 flex justify-between text-center">
                    <div>
                        <div className="border-t border-gray-500 w-48 mx-auto mb-1" />
                        <p className="text-sm text-gray-700">Applicant Signature</p>
                    </div>
                    <div>
                        <div className="border-t border-gray-500 w-48 mx-auto mb-1" />
                        <p className="text-sm text-gray-700">Admin Verification</p>
                    </div>
                </div>


                {/* FOOTER */}
                {/* <div className="mt-10 text-center text-xs text-gray-500">
                    © {new Date().getFullYear()}  Hika — Official Application Form
                </div> */}
            </div>

            {/* PRINT STYLES */}
            <style jsx global>{`
                .section-title {
                    font-size: 1rem;
                    font-weight: 700;
                    margin-bottom: 8px;
                    padding-bottom: 4px;
                    border-bottom: 2px solid #4a4a4a;
                }
                .sub-section-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                .form-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .form-table td {
                    border: 1px solid #d1d1d1;
                    padding: 8px 10px;
                    font-size: 14px;
                }
                .label {
                    background: #f5f5f5;
                    width: 35%;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .a4-page {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 30px !important;
                    }
                    .grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 6px !important;
                    }
                    img {
                        max-width: 60px !important;
                        max-height: 60px !important;
                    }
                    span {
                        font-size: 12px !important;
                    }
                    .flex {
                        flex-wrap: wrap !important;
                    }
                    .break-inside-avoid {
                        break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}
