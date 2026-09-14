"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getErrorMessage, authFetch } from "@/lib/utils";
import {
    Ticket,
    User,
    Search,
    Building2,
    Stethoscope,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Clock,
    ArrowLeft,
    XCircle,
} from "lucide-react";

// --- Types ---
interface PatientSearchResult {
    id: string;
    mrn: string;
    fullName: string;
    phoneNumber: string;
    gender: string;
    dateOfBirth: string;
}

interface Doctor {
    id: string;
    fullName: string;
    department: string;
}

interface VisitFormData {
    patientId: string;
    department: string;
    assignedDoctorId: string;
    triagePriority: "NORMAL" | "URGENT" | "EMERGENCY";
    paymentType: "CASH" | "INSURANCE" | "FREE_SCHEME";
    chiefComplaint: string;
}

const INITIAL_FORM_STATE: VisitFormData = {
    patientId: "",
    department: "General OPD",
    assignedDoctorId: "",
    triagePriority: "NORMAL",
    paymentType: "CASH",
    chiefComplaint: "",
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function CreateVisitPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedPatientId = searchParams?.get("patientId");

    // State Management
    const [patientSearch, setPatientSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
    const [searchingPatients, setSearchingPatients] = useState(false);

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);

    const [formData, setFormData] = useState<VisitFormData>(INITIAL_FORM_STATE);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [createdTicket, setCreatedTicket] = useState<{
        ticketNumber: string;
        department: string;
        patientName: string;
    } | null>(null);

    // 1. Search Debouncing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(patientSearch);
        }, 300);
        return () => clearTimeout(handler);
    }, [patientSearch]);

    // 2. Fetch Matching Patients
    const searchPatients = useCallback(async (query: string, signal?: AbortSignal) => {
        if (!query.trim()) {
            setPatientResults([]);
            return;
        }
        setSearchingPatients(true);
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/patients?q=${encodeURIComponent(query)}`,
                { credentials: "include", signal }
            );
            if (res.ok) {
                const data = await res.json();
                setPatientResults(data.patients || []);
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                console.error("Patient search error:", err);
            }
        } finally {
            setSearchingPatients(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        searchPatients(debouncedSearch, controller.signal);
        return () => controller.abort();
    }, [debouncedSearch, searchPatients]);

    // 3. Auto-load preselected patient if present in URL
    useEffect(() => {
        if (preselectedPatientId) {
            authFetch(`${API_BASE_URL}/api/patients/${preselectedPatientId}`, {
                credentials: "include",
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.patient) {
                        setSelectedPatient(data.patient);
                        setFormData((prev) => ({ ...prev, patientId: data.patient.id }));
                    }
                })
                .catch(console.error);
        }
    }, [preselectedPatientId]);

    // 4. Fetch Available Doctors for Department
    useEffect(() => {
        async function fetchDoctors() {
            setLoadingDoctors(true);
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctors?department=${encodeURIComponent(formData.department)}`,
                    { credentials: "include" }
                );
                if (res.ok) {
                    const data = await res.json();
                    setDoctors(data.doctors || []);
                }
            } catch (err) {
                console.error("Failed to fetch doctors:", err);
            } finally {
                setLoadingDoctors(false);
            }
        }

        fetchDoctors();
    }, [formData.department]);

    const handleSelectPatient = (patient: PatientSearchResult) => {
        setSelectedPatient(patient);
        setFormData((prev) => ({ ...prev, patientId: patient.id }));
        setPatientResults([]);
        setPatientSearch("");
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.patientId) {
            setErrorMsg("Please search and select a valid patient before issuing a visit ticket.");
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await authFetch(`${API_BASE_URL}/api/visits`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            if (res.status === 401 || res.status === 403) {
                setErrorMsg("Your session has expired or you do not have permission. Please log out and log in again.");
                return;
            }

            if (res.ok) {
                const data = await res.json();
                setCreatedTicket({
                    ticketNumber: data.visit.ticketNumber,
                    department: data.visit.department,
                    patientName: selectedPatient?.fullName || "Patient",
                });
            } else {
                const err = await res.json();
                setErrorMsg(getErrorMessage(err.error, "Failed to create visit queue ticket."));
            }
        } catch (err) {
            console.error("Queue assignment error:", err);
            setErrorMsg("A network error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "RECEPTIONIST"]}>
            <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">

                {/* Navigation & Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/reception/dashboard")}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Ticket className="w-6 h-6 text-sky-600" />
                                New Outpatient Visit Entry
                            </h1>
                            <p className="text-sm text-slate-500">
                                Route patients into active department queues and issue daily consultation tickets.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Success Modal / Banner */}
                {createdTicket ? (
                    <div className="bg-white p-8 border border-emerald-200 rounded-xl shadow-lg text-center space-y-4 max-w-lg mx-auto">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block">
                                Queue Ticket Issued
                            </span>
                            <p className="text-4xl font-extrabold text-slate-900 font-mono my-2">
                                {createdTicket.ticketNumber}
                            </p>
                            <p className="text-sm text-slate-600">
                                <b>{createdTicket.patientName}</b> has been queued for <b>{createdTicket.department}</b>.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    setCreatedTicket(null);
                                    setSelectedPatient(null);
                                    setFormData(INITIAL_FORM_STATE);
                                }}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition"
                            >
                                Issue Another Ticket
                            </button>
                            <button
                                onClick={() => router.push("/reception/dashboard")}
                                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-md transition"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Error Message */}
                        {errorMsg && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-800 text-sm">
                                <div className="flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setErrorMsg(null)}
                                    className="text-xs font-semibold underline hover:text-rose-900"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {/* Step 1: Select Patient */}
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <User className="w-5 h-5 text-sky-600" /> 1. Patient Selection
                            </h2>

                            {selectedPatient ? (
                                <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900 text-base">{selectedPatient.fullName}</h3>
                                            <span className="text-xs font-mono font-bold bg-sky-200 text-sky-900 px-2 py-0.5 rounded">
                                                MRN: {selectedPatient.mrn}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">
                                            {selectedPatient.gender} • Phone: {selectedPatient.phoneNumber}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedPatient(null);
                                            setFormData((prev) => ({ ...prev, patientId: "" }));
                                        }}
                                        className="text-xs font-bold text-sky-700 hover:underline"
                                    >
                                        Change Patient
                                    </button>
                                </div>
                            ) : (
                                <div className="relative space-y-2">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Search Registered Patient (Name, MRN, or Phone) *
                                    </label>
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Type to search..."
                                            value={patientSearch}
                                            onChange={(e) => setPatientSearch(e.target.value)}
                                            className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        />
                                        {searchingPatients && (
                                            <Loader2 className="w-4 h-4 absolute right-3 top-3 text-sky-600 animate-spin" />
                                        )}
                                    </div>

                                    {/* Dropdown Results */}
                                    {patientResults.length > 0 && (
                                        <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                                            {patientResults.map((patient) => (
                                                <div
                                                    key={patient.id}
                                                    onClick={() => handleSelectPatient(patient)}
                                                    className="p-3 hover:bg-sky-50 cursor-pointer transition flex items-center justify-between text-xs"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-800">{patient.fullName}</p>
                                                        <p className="text-slate-500">{patient.phoneNumber}</p>
                                                    </div>
                                                    <span className="font-mono font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                                                        {patient.mrn}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step 2: Visit & Queue Configuration */}
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <Building2 className="w-5 h-5 text-sky-600" /> 2. Visit Routing & Priorities
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Department *
                                    </label>
                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                                    >
                                        <option value="General OPD">General Outpatient (OPD)</option>
                                        <option value="Pediatrics">Pediatrics</option>
                                        <option value="Internal Medicine">Internal Medicine</option>
                                        <option value="Emergency">Emergency</option>
                                        <option value="Gynecology">Gynecology</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Assign Doctor (Optional)
                                    </label>
                                    <select
                                        name="assignedDoctorId"
                                        value={formData.assignedDoctorId}
                                        onChange={handleChange}
                                        disabled={loadingDoctors}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white disabled:bg-slate-100"
                                    >
                                        <option value="">Next Available Duty Doctor</option>
                                        {doctors.map((doc) => (
                                            <option key={doc.id} value={doc.id}>
                                                {doc.fullName} ({doc.department})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Triage / Priority Level *
                                    </label>
                                    <select
                                        name="triagePriority"
                                        value={formData.triagePriority}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                                    >
                                        <option value="NORMAL">Normal Routine</option>
                                        <option value="URGENT">Urgent Priority</option>
                                        <option value="EMERGENCY">Emergency / Immediate</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Payment Method / Source *
                                    </label>
                                    <select
                                        name="paymentType"
                                        value={formData.paymentType}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                                    >
                                        <option value="CASH">Out-of-Pocket / Cash</option>
                                        <option value="INSURANCE">Insurance Provider</option>
                                        <option value="FREE_SCHEME">Exempt / Free Scheme</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Chief Complaint / Reception Note
                                    </label>
                                    <textarea
                                        name="chiefComplaint"
                                        rows={2}
                                        placeholder="Briefly state primary reason for today's visit..."
                                        value={formData.chiefComplaint}
                                        onChange={handleChange}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !selectedPatient}
                            className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating Visit Ticket & Enqueuing...
                                </>
                            ) : (
                                "Issue Queue Ticket & Enqueue Patient"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </ProtectedRoute>
    );
}

export default function CreateVisitPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>}>
            <CreateVisitPageInner />
        </Suspense>
    );
}