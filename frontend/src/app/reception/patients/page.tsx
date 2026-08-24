"use client";

import React, { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getErrorMessage } from "@/lib/utils";
import {
    UserPlus,
    Search,
    UserCheck,
    AlertTriangle,
    Phone,
    MapPin,
    HeartPulse,
    Loader2,
    XCircle,
} from "lucide-react";

interface Patient {
    id: string;
    mrn: string;
    fullName: string;
    dateOfBirth: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    phoneNumber: string;
    address: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
    bloodGroup: string;
    knownAllergies: string | null;
    createdAt: string;
}

interface FormState {
    fullName: string;
    dateOfBirth: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    phoneNumber: string;
    address: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
    bloodGroup: string;
    knownAllergies: string;
}

const INITIAL_FORM_STATE: FormState = {
    fullName: "",
    dateOfBirth: "",
    gender: "MALE",
    phoneNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    bloodGroup: "UNKNOWN",
    knownAllergies: "",
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ReceptionPatientRegistrationPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [registeredSuccess, setRegisteredSuccess] = useState<Patient | null>(null);

    const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);

    // Debounce search input to avoid hitting backend on every key stroke
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch Patients with AbortController for clean lifecycle management
    const fetchPatients = useCallback(async (query = "", signal?: AbortSignal) => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/patients?q=${encodeURIComponent(query)}`,
                {
                    credentials: "include",
                    signal,
                }
            );

            if (res.ok) {
                const data = await res.json();
                setPatients(data.patients || []);
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("Failed to load patient master index:", err);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchPatients(debouncedQuery, controller.signal);

        return () => controller.abort();
    }, [debouncedQuery, fetchPatients]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg(null);
        setRegisteredSuccess(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/patients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    ...formData,
                    knownAllergies: formData.knownAllergies.trim() || undefined,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setRegisteredSuccess(data.patient);
                setFormData(INITIAL_FORM_STATE);
                fetchPatients(debouncedQuery);
            } else {
                const err = await res.json();
                setErrorMsg(getErrorMessage(err.error, "Failed to register patient"));
            }
        } catch (err) {
            console.error("Registration error:", err);
            setErrorMsg("An unexpected network error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "RECEPTIONIST"]}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-sky-600" />
                            Onsite Patient Registration Desk
                        </h1>
                        <p className="text-sm text-slate-500">
                            Register walk-in patients, auto-generate Medical Record Numbers (MRN), and capture emergency baselines.
                        </p>
                    </div>
                </div>

                {/* Success Alert */}
                {registeredSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <UserCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                            <div>
                                <p className="font-bold text-emerald-900 text-sm">
                                    Patient Registered Successfully!
                                </p>
                                <p className="text-xs text-emerald-700">
                                    {registeredSuccess.fullName} — Assigned MRN:{" "}
                                    <span className="font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">
                                        {registeredSuccess.mrn}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setRegisteredSuccess(null)}
                            className="text-xs font-semibold text-emerald-800 hover:underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Error Alert */}
                {errorMsg && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3 text-rose-800 text-sm font-medium">
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            {errorMsg}
                        </div>
                        <button
                            onClick={() => setErrorMsg(null)}
                            className="text-xs font-semibold text-rose-800 hover:underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Registration Form */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
                        <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <HeartPulse className="w-5 h-5 text-sky-600" /> Patient Demographics & Profile
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        required
                                        placeholder="e.g. Samuel Alemu Tadesse"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Date of Birth *
                                    </label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        required
                                        value={formData.dateOfBirth}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Gender *
                                    </label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                                    >
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="text"
                                        name="phoneNumber"
                                        required
                                        placeholder="+251 91 123 4567"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Blood Group
                                    </label>
                                    <select
                                        name="bloodGroup"
                                        value={formData.bloodGroup}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                                    >
                                        <option value="UNKNOWN">Unknown / Not Tested</option>
                                        <option value="A_POSITIVE">A +</option>
                                        <option value="A_NEGATIVE">A -</option>
                                        <option value="B_POSITIVE">B +</option>
                                        <option value="B_NEGATIVE">B -</option>
                                        <option value="AB_POSITIVE">AB +</option>
                                        <option value="AB_NEGATIVE">AB -</option>
                                        <option value="O_POSITIVE">O +</option>
                                        <option value="O_NEGATIVE">O -</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Home Address *
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        required
                                        placeholder="e.g. Bole Sub-city, Woreda 03, House No. 412, Addis Ababa"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="border-t border-slate-100 pt-4 space-y-3">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Emergency Contact Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700">Name *</label>
                                        <input
                                            type="text"
                                            name="emergencyContactName"
                                            required
                                            placeholder="Contact Name"
                                            value={formData.emergencyContactName}
                                            onChange={handleChange}
                                            className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700">Phone *</label>
                                        <input
                                            type="text"
                                            name="emergencyContactPhone"
                                            required
                                            placeholder="Contact Phone"
                                            value={formData.emergencyContactPhone}
                                            onChange={handleChange}
                                            className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700">Relationship *</label>
                                        <input
                                            type="text"
                                            name="emergencyContactRelation"
                                            required
                                            placeholder="e.g. Spouse / Parent"
                                            value={formData.emergencyContactRelation}
                                            onChange={handleChange}
                                            className="mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Clinical Alerts */}
                            <div className="border-t border-slate-100 pt-4 space-y-2">
                                <label className="block text-xs font-semibold text-slate-700 uppercase flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Known Allergies & Clinical Flags
                                </label>
                                <textarea
                                    name="knownAllergies"
                                    rows={2}
                                    placeholder="e.g. Penicillin allergy, Severe Asthma, Latex sensitivity..."
                                    value={formData.knownAllergies}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-semibold rounded-md text-sm transition flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating MRN & Registering...
                                    </>
                                ) : (
                                    "Complete Registration & Issue MRN"
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Master Patient Directory / Search Panel */}
                    <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-[700px]">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800 text-sm">Patient Master Index</h3>
                                {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-600" />}
                            </div>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Name, MRN, or Phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
                            {patients.map((patient) => (
                                <div
                                    key={patient.id}
                                    className="p-3 hover:bg-slate-50 border border-slate-100 rounded-lg transition space-y-1.5"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{patient.fullName}</h4>
                                            <p className="text-xs text-slate-500 font-mono font-semibold">
                                                MRN: <span className="text-sky-700">{patient.mrn}</span>
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                                            {patient.gender}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            {patient.phoneNumber}
                                        </span>
                                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                            {patient.address ? patient.address.split(",")[0] : "N/A"}
                                        </span>
                                    </div>

                                    {patient.knownAllergies && (
                                        <div className="text-[11px] bg-amber-50 text-amber-800 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                            <span className="truncate">{patient.knownAllergies}</span>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {!loading && patients.length === 0 && (
                                <div className="text-center py-12 text-slate-400 text-xs">
                                    No matching patients found in Master Index.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}