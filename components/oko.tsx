"use client";

import { useState } from "react";

export default function BulkLeadGenerator() {
    const [count, setCount] = useState(300);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const generateFakeLeadsCSV = (count: number) => {
        const headers = [
            "program",
            "candidateName",
            "ugDegree",
            "phoneNumber",
            "email",
            "dateOfBirth",
            "country",
            "state",
            "city",
            "counsellorName",
            "leadSource",
            "status",
            "communication",
            "followUpDate",
            "description",
            "createdBy",
        ];

        const programs = ["General", "Super Specialization"];
        const statuses = ["New", "Followup", "Admitted"];
        const communications = ["Phone", "Offline", "Email"];
        const countries = ["India", "USA", "UK"];
        const states = ["Tamil Nadu", "Karnataka", "Kerala"];
        const cities = ["Salem", "Chennai", "Coimbatore"];
        const counsellors = ["Admin", "Vijay Kumar", "Jagath Guru"];
        const fakeUserId = "698ef507cfe6401d02f95507";

        const rows: string[][] = [];
        const usedPhones: string[] = [];

        const randomFromArray = (arr: string[]) =>
            arr[Math.floor(Math.random() * arr.length)];

        const randomDate = (start: Date, end: Date) => {
            const date = new Date(
                start.getTime() + Math.random() * (end.getTime() - start.getTime())
            );
            return date.toISOString().split("T")[0];
        };

        const generatePhone = () => {
            let phone = "";

            do {
                phone = Math.floor(
                    1000000000 + Math.random() * 9000000000
                ).toString(); // always 10 digits
            } while (usedPhones.includes(phone));

            usedPhones.push(phone);
            return phone;
        };


        for (let i = 1; i <= count; i++) {
            rows.push([
                randomFromArray(programs),
                `Candidate ${i}`,
                "BSc",
                generatePhone(),

                `candidate${i}@gmail.com`,
                randomDate(new Date(1990, 0, 1), new Date(2005, 0, 1)),
                randomFromArray(countries),
                randomFromArray(states),
                randomFromArray(cities),
                randomFromArray(counsellors),
                "offline",
                randomFromArray(statuses),
                randomFromArray(communications),
                randomDate(new Date(), new Date(2026, 11, 31)),
                "Test bulk upload lead",
                fakeUserId,
            ]);
        }

        const csvContent =
            headers.join(",") +
            "\n" +
            rows.map((row) =>
                row.map((field) => `"${field}"`).join(",")
            ).join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `fake_leads_${count}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerate = () => {
        setLoading(true);
        setSuccess(false);

        setTimeout(() => {
            generateFakeLeadsCSV(count);
            setLoading(false);
            setSuccess(true);
        }, 500);
    };

    return (
        <div className="max-w-md p-6 bg-white shadow-lg rounded-2xl border">
            <h2 className="text-xl font-semibold mb-4">
                Generate Fake Leads CSV
            </h2>

            <div className="mb-4">
                <label className="block text-sm mb-2">
                    Number of Leads
                </label>
                <input
                    type="number"
                    value={count}
                    min={1}
                    max={5000}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2"
                />
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition"
            >
                {loading ? "Generating..." : `Generate ${count} Leads`}
            </button>

            {success && (
                <p className="mt-3 text-green-600 text-sm">
                    CSV downloaded successfully 🚀
                </p>
            )}
        </div>
    );
}
