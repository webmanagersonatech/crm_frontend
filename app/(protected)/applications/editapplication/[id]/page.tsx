"use client"

import { useParams } from "next/navigation"
import AddApplicationForm from "@/components/Forms/Addapplicationform"
import { Pencil } from "lucide-react";
import BackButton from "@/components/BackButton";

export default function EditApplicationPage() {
    const { id } = useParams()

    return (
        <div className="p-6">
            <div className="flex items-center gap-2 mb-6">

                <Pencil className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Edit Application
                </h1>


            </div>
            <BackButton />

            <AddApplicationForm
                applicationId={id as string}
                isEdit
                onSuccess={() => history.back()}
            />
        </div>
    )
}
