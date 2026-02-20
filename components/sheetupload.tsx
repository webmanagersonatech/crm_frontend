"use client";

import React, { useState } from "react";
import { bulkUploadApplications } from "@/app/lib/request/application";

export default function BulkUploadForm() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
    const [successCount, setSuccessCount] = useState<number>(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file) {
            alert("Please select a file");
            return;
        }

        try {
            setLoading(true);
            setErrors([]);
            setSuccessCount(0);

            const response = await bulkUploadApplications(file);

            setSuccessCount(response.successCount);
            setErrors(response.errors);

            alert("Upload completed!");

        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };
   const generateCSV = () => {
    const totalRecords = 1000;

    const headers = [
        "program",
        "academicYear",

        "Full Name",
        "Contact Number",
        "Email Address",
        "Alter Mobile Number",
        "Alter Email",
        "Date of Birth",
        "Age",
        "Gender",
        "Blood Group",
        "Are You Differently Abled?",
        "Community",
        "Hostel Required",
        "Passport Available?",
        "Nationality",

        "Father Name",
        "Father Age",
        "Father Mobile No",
        "Father Occupation",
        "Father Organization",
        "Father Designation",
        "Mother Name",
        "Mother Age",
        "Mother Mobile No",
        "Mother Occupation",
        "Mother Organization",
        "Mother Designation",
        "Annual Income",

        "Person Name",
        "Person Contact No",

        "Country",
        "State",
        "City",
        "Pincode",
        "Address",

        "Permanent Country",
        "Permanent State",
        "Permanent City",
        "Permanent Pincode",
        "Permanent Address",

        "10th School Name",
        "10th Board",
        "10th Marking Scheme",
        "10th Obtained Percentage",
        "After 10th Qualification",
        "10th Year of Passing",

        "12th Name of the School",
        "12th Board",
        "12th Medium",
        "12th Stream",
        "12th Year of Passing",
        "12th Obtained Percentage",

        "Graduation State",
        "Graduation City",
        "Graduation University",
        "Graduation Institute",
        "Pattern of Examination",
        "Degree Name",
        "Degree Mode",
        "Specialization",
        "Year of Commencement",
        "Year of Completion",
        "Graduation Result Status",

        "Max Marks/CGPA - 1st Sem",
        "Obtained Marks/CGPA - 1st Sem",
        "Percentage - 1st Sem",
        "Max Marks/CGPA - 2nd Sem",
        "Obtained Marks/CGPA - 2nd Sem",
        "Percentage - 2nd Sem",
        "Max Marks/CGPA - 3rd Sem",
        "Obtained Marks/CGPA - 3rd Sem",
        "Percentage - 3rd Sem",
        "Max Marks/CGPA - 4th Sem",
        "Obtained Marks/CGPA - 4th Sem",
        "Percentage - 4th Sem",

        "Academic Break?",
        "Do you have Post Graduation Details?",
        "Do you have any Work Experience?",

        "Entrance Exam",
        "Registration Id",
        "Date of Exam",
        "Entrance Exam Result Status",

        "Describe Your Hobbies",
        "What is your Career Goal?",
        "Do you plan to avail a study loan for the course?",
        "If you have participated in any sports / games at state/National level , Give Details",
       "Why you want to pursue MBA ? ",
        "How did you get to know about SONA?",
        "Are you currently pursuing or have you completed a degree?",

        "Applicant Name",
        "Parent Name"
    ];

    let rows: string[] = [];
    rows.push(headers.join(","));

    for (let i = 1; i <= totalRecords; i++) {

        const studentName = `Student ${i}`;
        const parentName = `Parent ${i}`;

        const row = [
            "Super Specialization",
            "2026-2027",

            studentName,
            `9${800000000 + i}`,
            `student${i}@mail.com`,
            `9${700000000 + i}`,
            `alt${i}@mail.com`,
            "2000-01-01",
            "24",
            i % 2 === 0 ? "Male" : "Female",
            "A-",
            "Yes",
            "BCM",
            "Yes",
            "Yes",
            "Indian",

            `Father ${i}`,
            "50",
            `9${600000000 + i}`,
            "Business",
            "Private",
            "Manager",
            `Mother ${i}`,
            "45",
            `9${500000000 + i}`,
            "Homemaker",
            "None",
            "House Wife",
            "300000",

            `Emergency ${i}`,
            `9${400000000 + i}`,

            "India",
            "Tamil Nadu",
            "Salem",
            "625533",
            "Test Address",

            "India",
            "Tamil Nadu",
            "Salem",
            "625533",
            "Permanent Address",

            "ABC School",
            "CBSE",
            "Regular",
            "85",
            "PUC",
            "2018",

            "XYZ School",
            "CBSE",
            "English",
            "Commerce",
            "2019",
            "88",

            "Tamil Nadu",
            "Salem",
            "Anna University",
            "ABC College",
            "Semester",
            "BBA",
            "Full Time",
            "Finance",
            "2020",
            "2023",
            "Pass",

            "100", "90", "90",
            "100", "85", "85",
            "100", "80", "80",
            "100", "88", "88",

            "No",
            "Yes",
            "Yes",

            "TANCET",
            `TN${2000 + i}`,
            "2026-02-13",
            "Pass",

            "Reading",
            "Become Manager",
            "Yes",
            "None",
            "Career Growth",
            "Friends",
            "Completed",

            studentName,
            parentName
        ];

        rows.push(row.map(val => `"${val}"`).join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "bulk_perfect_template.csv";
    link.click();

    window.URL.revokeObjectURL(url);
};





    return (
        <div className="p-4 border rounded-lg max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Bulk Upload Applications</h2>

            {/* File Input */}
            <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="border p-2 w-full"
            />

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
                {loading ? "Uploading..." : "Submit"}
            </button>

            <button
                onClick={generateCSV}
                style={{
                    background: "#2563eb",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer"
                }}
            >
                Generate 1000 Unique Records Sheet
            </button>

            {/* Success Count */}
            {successCount > 0 && (
                <div className="text-green-600">
                    Successfully Uploaded: {successCount}
                </div>
            )}

            {/* Error List */}
            {errors?.length > 0 && (
                <div className="text-red-600">
                    <h3 className="font-medium">Errors:</h3>
                    {errors?.map((err) => (
                        <div key={err.row}>
                            Row {err.row}: {err.message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
