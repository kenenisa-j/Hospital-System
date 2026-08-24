"use client";

import React, { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
    Users,
    Stethoscope,
    Clock,
    CheckCircle2,
    AlertTriangle,
    UserCheck,
    ChevronRight,
    Loader2,
    RefreshCw,
} from "lucide-react";

// --- Types ---
interface PatientQueueItem {
    id: string;
    ticketNumber: string;
    patientName: string;
    patientMrn: string;
    department: string;
    assignedDoctorId?: string | null;
    status: "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "PENDING_PAYMENT";
    arrivalTime: string;
    triagePriority: "NORMAL" | "URGENT" | "EMERGENCY";
    chiefComplaint?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DoctorLiveQueuePage() {
    const { user } = useAuth();
    const currentDepartment = user?.department || "General OPD";
    const doctorId = user?.id || "";

    const [queue, setQueue] = useState<PatientQueueItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeCallId, setActiveCallId] = useState<string | null>(null);

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/doctor/queue?department=${encodeURIComponent(currentDepartment)}`,
                { credentials: "include" }
            );
            if (res.ok) {
                const data = await res.json();
                setQueue(data.queue || []);
            }
        } catch (err) {
            console.error("Failed to fetch queue:", err);
        } finally {
            setLoading(false);
        }
    }, [currentDepartment]);

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(() => {
            fetchQueue();
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchQueue]);

    // Separate waiting vs in-consultation lists
    const waitingPatients = queue.filter((item) => item.status === "WAITING");
    const inConsultation = queue.filter((item) => item.status === "IN_CONSULTATION");

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">

                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Stethoscope className="w-6 h-6 text-sky-600" />
                            Doctor Consultation Queue
                        </h1>
                        <p className="text-sm text-slate-500">
                            Live updates for cleared walk-in and appointment patients in <b>{currentDepartment}</b>.
                        </p>
                    </div>

                    <button
                        onClick={fetchQueue}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600 self-start sm:self-auto"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh Queue
                    </button>
                </div>

                {/* Queue Directory View */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Waiting Queue (Live List) */}
                    <div className="md:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-500" />
                                Waiting Patients ({waitingPatients.length})
                            </h2>
                            <span className="text-xs font-medium text-slate-400">
                                Sorted by arrival & priority
                            </span>
                        </div>

                        {loading && queue.length === 0 ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
                            </div>
                        ) : waitingPatients.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                                <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                                <p className="font-semibold text-slate-600">No patients waiting in queue.</p>
                                <p>New arrivals will appear here automatically as soon as payments clear at the Cashier.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {waitingPatients.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className={`p-4 rounded-lg border transition flex items-center justify-between ${patient.triagePriority === "EMERGENCY"
                                                ? "bg-rose-50 border-rose-200"
                                                : patient.triagePriority === "URGENT"
                                                    ? "bg-amber-50 border-amber-200"
                                                    : "bg-slate-50 border-slate-200"
                                            }`}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-extrabold text-sky-800 bg-sky-100 px-2 py-0.5 rounded text-sm">
                                                    {patient.ticketNumber}
                                                </span>
                                                <h3 className="font-bold text-slate-900 text-sm">{patient.patientName}</h3>
                                                {patient.triagePriority !== "NORMAL" && (
                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${patient.triagePriority === "EMERGENCY"
                                                                ? "bg-rose-600 text-white"
                                                                : "bg-amber-200 text-amber-900"
                                                            }`}
                                                    >
                                                        {patient.triagePriority}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono">
                                                MRN: {patient.patientMrn} • Arrived at{" "}
                                                {new Date(patient.arrivalTime).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                            {patient.chiefComplaint && (
                                                <p className="text-xs text-slate-400 italic">
                                                    &ldquo;{patient.chiefComplaint}&rdquo;
                                                </p>
                                            )}
                                        </div>

                                        <a
                                            href={`/doctor/consultation/${patient.id}`}
                                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-md transition flex items-center gap-1 shadow-sm"
                                        >
                                            Call Patient <ChevronRight className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Consultation Panel */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                            <UserCheck className="w-5 h-5 text-emerald-600" />
                            Active Consultation
                        </h2>

                        {inConsultation.length === 0 ? (
                            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                                No active consultation in progress. Call a patient from the waiting queue to start.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {inConsultation.map((patient) => (
                                    <div key={patient.id} className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                                            Currently Seeing
                                        </span>
                                        <p className="font-bold text-slate-900 text-base">{patient.patientName}</p>
                                        <p className="text-xs font-mono text-slate-600">MRN: {patient.patientMrn}</p>
                                        <a
                                            href={`/doctor/consultation/${patient.id}`}
                                            className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition block text-center"
                                        >
                                            Open Clinical EHR
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </ProtectedRoute>
    );
}