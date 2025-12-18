"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getApplicationById } from "@/app/lib/request/application";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, Printer } from "lucide-react";
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
        const load = async () => {
            setIsLoading(true); // start loading

            try {
                const res = await getApplicationById(id as string);
                setData(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false); // stop loading
            }
        };

        if (id) load();
    }, [id]);

    if (isLoading) return <Spinner />;

    return (
        <div className="p-6">

            {/* TOP BAR: BACK + PRINT BUTTON */}
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
            <div ref={printRef} className="a4-page bg-white shadow-xl rounded-lg p-10 border border-gray-300">

                {/* HEADER WITH LOGO */}
                <div className="flex items-center justify-between mb-6">
                    {/* Left - Logo */}
                    <div className="flex-shrink-0">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-20 h-20 object-contain"
                        />
                    </div>

                    {/* Center - Title */}
                    <div className="text-center flex-1">
                        <h1 className="text-2xl font-bold tracking-wide">
                            SONA HIKA - APPLICATION FORM
                        </h1>
                    </div>

                    {/* Right - Application ID */}
                    <div className="text-right text-sm text-gray-600">
                        Application ID:
                        <div className="font-semibold">{data?.applicationId}</div>
                    </div>
                </div>


                {/* PERSONAL DETAILS */}
                <section className="mb-6">
                    <h2 className="section-title">PERSONAL INFORMATION</h2>

                    <table className="form-table">
                        <tbody>
                            {Object.entries(data?.personalData || {}).map(([key, value]) => (
                                <tr key={key}>
                                    <td className="label">{key}</td>
                                    <td className="value">{value !== undefined && value !== null ? String(value) : "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* EDUCATION DETAILS */}
                <section className="mb-6">
                    <h2 className="section-title">EDUCATIONAL DETAILS</h2>

                    <table className="form-table">
                        <tbody>
                            {Object.entries(data?.educationData || {}).map(([key, value]) => (
                                <tr key={key}>
                                    <td className="label">{key}</td>
                                    <td className="value">{value !== undefined && value !== null ? String(value) : "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* PROGRAM INFO */}
                {/* PROGRAM DETAILS */}
                <section className="mb-6">
                    <h2 className="section-title">PROGRAM DETAILS</h2>

                    <table className="form-table">
                        <tbody>
                            <tr>
                                <td className="label">Program Applied For</td>
                                <td className="value">{data?.program || "-"}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {/* ACADEMIC YEAR */}
                <section className="mb-6">
                    <h2 className="section-title">ACADEMIC YEAR</h2>

                    <table className="form-table">
                        <tbody>
                            <tr>
                                <td className="label">Academic Year</td>
                                <td className="value">{data?.academicYear || "-"}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {/* PAYMENT STATUS */}
                <section className="mb-6">
                    <h2 className="section-title">PAYMENT STATUS</h2>

                    <table className="form-table">
                        <tbody>
                            <tr>
                                <td className="label">Payment Status</td>
                                <td className="value">{data?.paymentStatus || "-"}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>


                {/* SIGNATURE SECTION */}
                <div className="mt-16 grid grid-cols-2 text-center gap-10">
                    <div>
                        <div className="border-t border-gray-500 w-48 mx-auto mb-1"></div>
                        <p className="text-sm text-gray-700">Applicant Signature</p>
                    </div>

                    <div>
                        <div className="border-t border-gray-500 w-48 mx-auto mb-1"></div>
                        <p className="text-sm text-gray-700">Admin Verification</p>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="mt-10 text-center text-gray-500 text-xs">
                    © {new Date().getFullYear()} Sona Hika — Official Application Form
                </div>
            </div>

            {/* PRINT CSS */}
            <style jsx global>{`
    .section-title {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #4a4a4a;
      color: #222;
      letter-spacing: 0.5px;
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
      background:#f5f5f5;
      width: 35%;
      font-weight: 600;
      text-transform: capitalize;
    }

    @media print {
      .no-print {
        display: none !important;
      }

      .a4-page {
        width: 100%;
        max-width: 800px;
        padding: 40px !important;
        margin: 0 auto;
        border: none !important;
      }
    }
  `}</style>
        </div>

    );
}
