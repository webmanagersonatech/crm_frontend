"use client";


import { FilePlus2,  } from "lucide-react";

import AddapplicationForm from "@/components/Forms/Addapplicationform";



export default function AddApplicationPage() {

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <FilePlus2 className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Add Application
                </h1>
            </div>

            <AddapplicationForm/>


        </div>
    );
}
