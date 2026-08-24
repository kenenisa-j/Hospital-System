"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getErrorMessage } from "@/lib/utils";
import {
    Stethoscope,
    Hospital,
    BedDouble,
    CheckCircle2,
    AlertCircle,
    Search,
    Loader2,
    PlusCircle
} from "lucide-react";

interface Bed {
    id: string;
    roomId?: string | null;
    bedNumber: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE';
}

interface Room {
    id: string;
    wardId: string;
    roomNumber: string;
    roomType: string;
    capacity: number;
    beds: Bed[];
}

interface Ward {
    id: string;
    name: string;
    code: string;
    floor: number;
    rooms: Room[];
}

interface Patient {
    id: string;
    mrn: string;
    fullName: string;
    phoneNumber: string;
}

interface AdmissionOrderFormProps {
    initialPatientId?: string;
    initialPatientName?: string;
    initialPatientMrn?: string;
    onSuccess?: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdmissionOrderForm({
    initialPatientId = "",
    initialPatientName = "",
    initialPatientMrn = "",
    onSuccess
}: AdmissionOrderFormProps) {
    const [patient, setPatient] = useState<Patient | null>(
        initialPatientId ? { id: initialPatientId, fullName: initialPatientName, mrn: initialPatientMrn, phoneNumber: "" } : null
    );

    // Search patient state (if initialPatientId not provided)
    const [patientSearch, setPatientSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [patientResults, setPatientResults] = useState<Patient[]>([]);
    const [searchingPatients, setSearchingPatients] = useState(false);

    // Wards and beds state
    const [wards, setWards] = useState<Ward[]>([]);
    const [loadingWards, setLoadingWards] = useState(true);
    const [wardId, setWardId] = useState<string>("");
    const [selectedBedId, setSelectedBedId] = useState<string>("");
    const [admissionReason, setAdmissionReason] = useState<string>("");
    const [doctorNotes, setDoctorNotes] = useState<string>("");

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Debounce patient search
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(patientSearch), 300);
        return () => clearTimeout(handler);
    }, [patientSearch]);

    // Patient search query
    useEffect(() => {
        if (!debouncedSearch.trim()) {
            setPatientResults([]);
            return;
        }
        const controller = new AbortController();
        const searchPatients = async () => {
            setSearchingPatients(true);
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/patients?q=${encodeURIComponent(debouncedSearch)}`,
                    { credentials: "include", signal: controller.signal }
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
        };
        searchPatients();
        return () => controller.abort();
    }, [debouncedSearch]);

    // Fetch wards layout
    const fetchWards = useCallback(async () => {
        setLoadingWards(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setWards(data.wards || []);
            }
        } catch (err) {
            console.error("Failed to fetch wards:", err);
        } finally {
            setLoadingWards(false);
        }
    }, []);

    useEffect(() => {
        fetchWards();
    }, [fetchWards]);

    const activeWard = wards.find(w => w.id === wardId);
    // Flatten all beds of all rooms of the selected ward
    const bedsInSelectedWard = activeWard
        ? activeWard.rooms.reduce<Bed[]>((acc, room) => [...acc, ...room.beds], [])
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient) {
            setErrorMsg("Please select a patient first.");
            return;
        }
        if (!selectedBedId) {
            setErrorMsg("Please allocate a bed.");
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/admissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    patientId: patient.id,
                    bedId: selectedBedId,
                    reason: admissionReason,
                    doctorNotes: doctorNotes || undefined
                }),
            });

            if (res.ok) {
                setSuccessMsg("Inpatient admission order successfully registered.");
                setAdmissionReason("");
                setDoctorNotes("");
                setSelectedBedId("");
                setWardId("");
                fetchWards(); // reload available beds status
                if (onSuccess) onSuccess();
            } else {
                const err = await res.json();
                setErrorMsg(getErrorMessage(err.error, "Failed to create admission order."));
            }
        } catch (err) {
            console.error("Admission order submit error:", err);
            setErrorMsg("A network error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">New Inpatient Admission Order</h1>
                    <p className="text-sm text-slate-500">Create a formal admission request and allocate a bed.</p>
                </div>
            </div>

            {errorMsg && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {successMsg && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Selector */}
                {patient ? (
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-indigo-100 rounded-full text-indigo-700">
                                <Stethoscope className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Patient</div>
                                <div className="text-sm font-semibold text-indigo-800">{patient.fullName} (MRN: {patient.mrn})</div>
                            </div>
                        </div>
                        {!initialPatientId && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPatient(null);
                                    setPatientSearch("");
                                }}
                                className="text-xs font-bold text-indigo-700 hover:underline"
                            >
                                Change Patient
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase">Search Patient for Admission *</label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or MRN..."
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            {searchingPatients && (
                                <Loader2 className="w-4 h-4 absolute right-3 top-3 text-indigo-600 animate-spin" />
                            )}
                        </div>

                        {patientResults.length > 0 && (
                            <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                                {patientResults.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setPatient(p)}
                                        className="w-full text-left p-3 hover:bg-slate-50 transition text-xs flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-800">{p.fullName}</p>
                                            <p className="text-slate-400">{p.phoneNumber}</p>
                                        </div>
                                        <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">{p.mrn}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Admission Details */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Admission *</label>
                            <textarea
                                required
                                rows={3}
                                value={admissionReason}
                                onChange={(e) => setAdmissionReason(e.target.value)}
                                placeholder="Clinical diagnosis, symptoms, and admission instructions..."
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Doctor Notes (Optional)</label>
                            <textarea
                                rows={2}
                                value={doctorNotes}
                                onChange={(e) => setDoctorNotes(e.target.value)}
                                placeholder="Additional guidelines, medication history, precautions..."
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Right Column: Ward & Bed Allocation */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Ward *</label>
                            {loadingWards ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading wards list...
                                </div>
                            ) : (
                                <select
                                    required
                                    value={wardId}
                                    onChange={(e) => {
                                        setWardId(e.target.value);
                                        setSelectedBedId("");
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    <option value="">-- Choose a Ward --</option>
                                    {wards.map(w => (
                                        <option key={w.id} value={w.id}>{w.name} (Floor {w.floor})</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {wardId && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Available Beds</label>
                                {bedsInSelectedWard.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-semibold italic">No beds configured in this ward.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                        {bedsInSelectedWard.map(bed => (
                                            <button
                                                key={bed.id}
                                                type="button"
                                                disabled={bed.status !== 'AVAILABLE'}
                                                onClick={() => setSelectedBedId(bed.id)}
                                                className={`px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center justify-between transition ${
                                                    selectedBedId === bed.id
                                                        ? "bg-indigo-600 text-white border-indigo-600"
                                                        : bed.status === 'AVAILABLE'
                                                            ? "bg-white text-slate-700 border-slate-300 hover:border-indigo-400"
                                                            : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <BedDouble className="w-4 h-4" />
                                                    {bed.bedNumber}
                                                </span>
                                                {bed.status === 'AVAILABLE' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3 text-slate-400" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        type="submit"
                        disabled={submitting || !wardId || !selectedBedId || !patient}
                        className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Create Admission Order
                    </button>
                </div>
            </form>
        </div>
    );
}