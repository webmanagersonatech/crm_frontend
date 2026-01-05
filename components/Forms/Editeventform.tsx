"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getEventById, updateEvent } from "@/app/lib/request/eventsRequest";

interface EditEventFormProps {
    eventId: string;           // Mongo _id
    onSuccess: () => void;
    onClose: () => void;
}

interface EventFormState {
    name: string;
    mobile: string;
    email?: string;
    location?: string;
    eventName: string;
    enrolledDate?: string;
}

export default function EditEventForm({
    eventId,
    onSuccess,
    onClose,
}: EditEventFormProps) {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [form, setForm] = useState<EventFormState>({
        name: "",
        mobile: "",
        email: "",
        location: "",
        eventName: "",
        enrolledDate: "",
    });

    /* -------------------------------------------
       Fetch Event Details
    -------------------------------------------- */
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await getEventById(eventId);
                const event = res.data || res;

                setForm({
                    name: event.name || "",
                    mobile: event.mobile || "",
                    email: event.email || "",
                    location: event.location || "",
                    eventName: event.eventName || "",
                    enrolledDate: event.enrolledDate || "",
                });
            } catch (error: any) {
                toast.error(error.message || "Failed to load event");
            } finally {
                setInitialLoading(false);
            }
        };

        fetchEvent();
    }, [eventId]);

    /* -------------------------------------------
       Handle Change
    -------------------------------------------- */
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    /* -------------------------------------------
       Submit
    -------------------------------------------- */
    const handleSubmit = async () => {
        if (!form.name || !form.mobile || !form.eventName) {
            toast.error("Name, Mobile & Event Name are required");
            return;
        }

        try {
            setLoading(true);
            await updateEvent(eventId, form);
            toast.success("Event updated successfully");
            onSuccess();
        } catch (err: any) {
            toast.error(String(err)); // ✅ FORCE STRING
        } finally {
            setLoading(false);
        }
    };


    if (initialLoading) {
        return <p className="text-center py-10">Loading event...</p>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Edit Event</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                    <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>

                {/* Mobile */}
                <div>
                    <label className="text-sm font-medium">Mobile <span className="text-red-500">*</span></label>
                    <input
                        name="mobile"
                        value={form.mobile}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="text-sm font-medium">Email</label>
                    <input
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>

                {/* Location */}
                <div>
                    <label className="text-sm font-medium">Location</label>
                    <input
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>

                {/* Event Name */}
                <div>
                    <label className="text-sm font-medium">Event Name <span className="text-red-500">*</span></label>
                    <input
                        name="eventName"
                        value={form.eventName}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>

                {/* Enrolled Date */}
                <div>
                    <label className="text-sm font-medium">Enrolled Date</label>
                    <input
                        type="date"
                        name="enrolledDate"
                        value={form.enrolledDate}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border"
                >
                    Cancel
                </button>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {loading ? "Updating..." : "Update Event"}
                </button>
            </div>
        </div>
    );
}
