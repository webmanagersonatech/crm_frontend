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
    const BASE_URL = "https://hikabackend.sonastar.com/uploads/";

    // Helper function to check if a section has any non-empty values
    const isSectionEmpty = (section: any) => {
        if (!section || !section.fields) return true;
        const values = Object.values(section.fields);
        // Check if all values are empty strings, null, undefined, or empty arrays
        return values.every(value => 
            value === "" || 
            value === null || 
            value === undefined || 
            (Array.isArray(value) && value.length === 0)
        );
    };

    // Helper function to filter out empty sections from an array
    const filterNonEmptySections = (sections: any[]) => {
        if (!sections || !Array.isArray(sections)) return [];
        return sections.filter(section => !isSectionEmpty(section));
    };

    // Check if education details exist and filter out empty sections
    const hasEducationDetails = data?.educationDetails && data.educationDetails.length > 0;
    
    // Filter out empty sections from personalDetails and educationDetails
    const filteredPersonalDetailsRaw = data?.personalDetails ? filterNonEmptySections(data.personalDetails) : [];
    const filteredEducationDetailsRaw = data?.educationDetails ? filterNonEmptySections(data.educationDetails) : [];

    // Find Declaration and Enclosures sections from the filtered arrays
    const declarationSection = filteredEducationDetailsRaw.find(
        (section: any) => section.sectionName === "Declaration"
    ) || filteredPersonalDetailsRaw.find(
        (section: any) => section.sectionName === "Declaration"
    );

    const enclosuresSection = filteredEducationDetailsRaw.find(
        (section: any) => section.sectionName === "Enclosures"
    ) || filteredPersonalDetailsRaw.find(
        (section: any) => section.sectionName === "Enclosures"
    );

    // Filter out Declaration and Enclosures from educationDetails for normal rendering
    const filteredEducationDetails = filteredEducationDetailsRaw.filter(
        (section: any) => !["Declaration", "Enclosures"].includes(section.sectionName)
    );

    // Filter out Declaration and Enclosures from personalDetails
    const filteredPersonalDetails = filteredPersonalDetailsRaw.filter(
        (section: any) => !["Declaration", "Enclosures"].includes(section.sectionName)
    );

    // Function to get sub-section letter (a, b, c, d, ...)
    const getSubSectionLetter = (index: number) => {
        return String.fromCharCode(97 + index); // 97 is 'a' in ASCII
    };

    const renderSubSections = (sections: any[], mainNumber: number) =>
        sections.map((section: any, idx: number) => {
            const subLetter = getSubSectionLetter(idx);
            const displayTitle = `${mainNumber}(${subLetter}). ${section.sectionName}`;

            return (
                <div key={section.sectionName} className="mb-6 border rounded-md overflow-hidden">
                    {/* BLUE HEADER */}
                    <div className="bg-blue-700 text-white px-4 py-2 font-semibold">
                        {displayTitle}
                    </div>

                    {/* CONTENT */}
                    <div className="p-3 overflow-x-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm print:grid-cols-3 print:gap-1 min-w-[300px] md:min-w-0">
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
                                    <div
                                        key={key}
                                        className="grid grid-cols-[160px_1fr] border border-gray-300 overflow-hidden break-inside-avoid print:grid-cols-[160px_1fr] print:border print:border-gray-300"
                                    >
                                        {/* KEY - Fixed width column */}
                                        <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 border-r border-gray-300 print:border-r print:border-gray-300">
                                            {key.replace(/_/g, " ")}
                                        </span>

                                        {/* VALUE - Flexible column */}
                                        <span className="text-gray-700 px-2 py-1 whitespace-pre-wrap break-words">
                                            {isImage ? (
                                                <a
                                                    href={`${BASE_URL}${value}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <img
                                                        src={`${BASE_URL}${value}`}
                                                        alt={key}
                                                        className="max-h-[60px] max-w-[60px] object-contain cursor-pointer hover:opacity-80 transition"
                                                    />
                                                </a>
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
                                                ""
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        });

    const renderFullWidthSection = (section: any, mainNumber: number) => {
        return (
            <div key={section.sectionName} className="mb-6 border rounded-md overflow-hidden">
                <div className="bg-blue-700 text-white px-4 py-2 font-semibold">
                    {mainNumber}. {section.sectionName}
                </div>
                <div className="p-3 overflow-x-auto">
                    <div className="space-y-2 text-sm">
                        {Object.entries(section.fields as Record<string, any>).map(([key, rawValue]) => {
                            let value = rawValue;

                            if (Array.isArray(value)) {
                                value = value.join(", ");
                            }

                            // Skip rendering if value is empty
                            if (value === undefined || value === null || value === "") {
                                return null;
                            }

                            return (
                                <div
                                    key={key}
                                    className="border border-gray-300 overflow-hidden"
                                >
                                    {/* KEY */}
                                    <div className="font-semibold text-gray-800 bg-gray-100 px-3 py-2 border-b border-gray-300">
                                        {key.replace(/_/g, " ")}
                                    </div>

                                    {/* VALUE */}
                                    <div className="text-gray-700 px-3 py-2 whitespace-pre-wrap break-words">
                                        {typeof value === "string" ? (
                                            <div className="whitespace-pre-wrap">
                                                {value.split('\n').map((line, i) => (
                                                    <div key={i}>{line || <br />}</div>
                                                ))}
                                            </div>
                                        ) : (
                                            String(value)
                                        )}
                                    </div>
                                </div>
                            );
                        }).filter(Boolean)} {/* Filter out null values */}
                    </div>
                </div>
            </div>
        );
    };

    // Calculate section numbers dynamically based on what sections exist
    let currentNumber = 1;
    const personalNumber = currentNumber++;
    const educationNumber = filteredEducationDetails.length > 0 ? currentNumber++ : null;
    const programNumber = currentNumber++;
    const declarationNumber = declarationSection ? currentNumber++ : null;
    const enclosuresNumber = enclosuresSection ? currentNumber++ : null;

    // Check if education section should be rendered
    const shouldShowEducation = filteredEducationDetails.length > 0;

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
                className="a4-page bg-white shadow-xl rounded-lg p-4 md:p-10 border border-gray-300 overflow-x-auto"
            >
                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                    <img
                        src={data?.instituteLogo || "/logo.png"}
                        alt="Logo"
                        className="w-20 h-20 object-contain"
                    />

                    <h1 className="text-xl font-bold text-center flex-1">
                        APPLICATION FORM <span>| </span>
                        <span>
                            {data?.academicYear}
                        </span>
                    </h1>

                    <div className="text-right text-sm text-gray-600">
                        Application ID
                        <div className="font-semibold">{data?.applicationId || "-"}</div>
                    </div>
                </div>

                {/* 1. PERSONAL DETAILS */}
                <section className="mb-6">
                    <h2 className="section-title">{personalNumber}. STUDENT PERSONAL DETAILS</h2>
                    {filteredPersonalDetails && filteredPersonalDetails.length > 0 ? (
                        renderSubSections(filteredPersonalDetails, personalNumber)
                    ) : (
                        <div className="text-center text-gray-500 py-8 border rounded-md">
                            No Student personal details available
                        </div>
                    )}
                </section>

                {/* 2. EDUCATION DETAILS - Only show if exists and has non-empty sections */}
                {shouldShowEducation && (
                    <section className="mb-6">
                        <h2 className="section-title">{educationNumber}. EDUCATION DETAILS</h2>
                        {renderSubSections(filteredEducationDetails, educationNumber as number)}
                    </section>
                )}

                {/* PROGRAM DETAILS */}
                <section className="mb-8 border rounded-md overflow-hidden">
                    <div className="bg-blue-700 text-white px-4 py-2 font-semibold">
                        {programNumber}. PROGRAM DETAILS
                    </div>

                    <div className="p-4 overflow-x-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm print:grid-cols-3 print:gap-1 min-w-[300px] md:min-w-0">
                            {/* Program */}
                            <div className="grid grid-cols-[160px_1fr] border border-gray-300 overflow-hidden print:grid-cols-[160px_1fr] print:border print:border-gray-300">
                                <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 border-r border-gray-300 print:border-r print:border-gray-300">
                                    Program Applied For
                                </span>
                                <span className="text-gray-700 px-2 py-1 break-words">
                                    {data?.program || ""}
                                </span>
                            </div>

                            {/* Academic Year */}
                            <div className="grid grid-cols-[160px_1fr] border border-gray-300 overflow-hidden print:grid-cols-[160px_1fr] print:border print:border-gray-300">
                                <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 border-r border-gray-300 print:border-r print:border-gray-300">
                                    Academic Year
                                </span>
                                <span className="text-gray-700 px-2 py-1 break-words">
                                    {data?.academicYear || ""}
                                </span>
                            </div>

                            {/* Payment Status */}
                            <div className="grid grid-cols-[160px_1fr] border border-gray-300 overflow-hidden print:grid-cols-[160px_1fr] print:border print:border-gray-300">
                                <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 border-r border-gray-300 print:border-r print:border-gray-300">
                                    Payment Status
                                </span>
                                <span className="text-gray-700 px-2 py-1 break-words">
                                    {data?.paymentStatus || ""}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* DECLARATION SECTION */}
                {declarationSection && (
                    renderFullWidthSection(declarationSection, declarationNumber as number)
                )}

                {/* ENCLOSURES SECTION */}
                {enclosuresSection && (
                    renderFullWidthSection(enclosuresSection, enclosuresNumber as number)
                )}

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
    
    @media print {
        .no-print {
            display: none !important;
        }
        
        @page {
            margin-top: 5mm;
            margin-bottom: 10mm;
        }
        
        .a4-page {
            page-break-after: always;
            border: none !important;
            box-shadow: none !important;
            padding: 30px !important;
            background: white !important;
            overflow: visible !important;
        }
        
        /* Use Grid for print */
        .grid {
            display: grid !important;
        }
        
        /* Ensure consistent column widths */
        .grid-cols-\\[160px_1fr\\] {
            grid-template-columns: 160px 1fr !important;
        }
        
        /* Override any flex properties */
        .flex {
            display: flex !important;
            flex-wrap: nowrap !important;
        }
        
        /* Consistent borders in print */
        .border, .border-r, .border-gray-300 {
            border-color: #d1d1d1 !important;
        }
        
        .border-r {
            border-right-width: 1px !important;
            border-right-style: solid !important;
        }
        
        /* Keep images sized properly */
        img {
            max-width: 60px !important;
            max-height: 60px !important;
        }
        
        /* Prevent page breaks inside entries */
        .break-inside-avoid {
            break-inside: avoid !important;
        }
        
        /* Ensure text doesn't overflow */
        .break-words {
            word-break: break-word !important;
        }
        
        /* Remove scrollbars in print */
        .overflow-x-auto {
            overflow: visible !important;
        }
    }
    
    /* Mobile styles - enable horizontal scroll */
    @media (max-width: 768px) {
        .overflow-x-auto {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
        }
        
        /* Add subtle scrollbar for better UX */
        .overflow-x-auto::-webkit-scrollbar {
            height: 6px;
        }
        
        .overflow-x-auto::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }
        
        .overflow-x-auto::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }
        
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
    }
`}</style>
        </div>
    );
}