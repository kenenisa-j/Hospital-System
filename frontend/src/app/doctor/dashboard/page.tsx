"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
    Stethoscope,
    Users,
    Clock,
    Activity,
    FlaskConical,
    Radio,
    ChevronRight,
    UserCheck,
    AlertCircle,
    Loader2,
    CheckCircle2,
    ArrowUpRight,
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

interface PendingResult {
    id: string;
    patientName: string;
    patientMrn: string;
    type: "LAB" | "RADIOLOGY";
    testName: string;
    requestedAt: string;
    status: "READY" | "CRITICAL";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DoctorDashboardPage() {
    const { user } = useAuth();

    // Use the real department from logged-in user, fallback to General OPD
    const currentDepartment = user?.department || "General OPD";

    // Queue fetched from DB (HTTP polling)
    const [queue, setQueue] = useState<PatientQueueItem[]>([]);
    const [loadingQueue, setLoadingQueue] = useState(true);

    // Pending Results & Summary Metrics
    const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);
    const [loadingResults, setLoadingResults] = useState(true);
    const [completedCount, setCompletedCount] = useState(0);
    const [pendingLabCount, setPendingLabCount] = useState(0);
    const [pendingRadCount, setPendingRadCount] = useState(0);

    // Fetch the live queue from DB via HTTP
    const fetchQueue = useCallback(async () => {
        setLoadingQueue(true);
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
            console.error("Failed to fetch doctor queue:", err);
        } finally {
            setLoadingQueue(false);
        }
    }, [currentDepartment]);

    // Fetch pending Lab/Radiology reports for doctor's active cases
    const fetchDoctorOverviewData = useCallback(async () => {
        setLoadingResults(true);
        try {
            const doctorId = user?.id ?? "";
            const res = await fetch(
                `${API_BASE_URL}/api/doctor/overview?doctorId=${doctorId}`,
                { credentials: "include" }
            );
            if (res.ok) {
                const data = await res.json();
                setPendingResults(data.pendingResults || []);
                setCompletedCount(data.completedTodayCount || 0);
                setPendingLabCount(data.pendingLabCount || 0);
                setPendingRadCount(data.pendingRadCount || 0);
            }
        } catch (err) {
            console.error("Failed to fetch doctor dashboard metrics:", err);
        } finally {
            setLoadingResults(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchQueue();
        fetchDoctorOverviewData();

        // Auto-refresh queue every 15 seconds
        const interval = setInterval(() => {
            fetchQueue();
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchQueue, fetchDoctorOverviewData]);

    // Derived Queue Subsets
    const waitingPatients = queue.filter((item) => item.status === "WAITING");
    const inConsultationPatients = queue.filter((item) => item.status === "IN_CONSULTATION");
    const emergencyCount = queue.filter((item) => item.triagePriority === "EMERGENCY").length;

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">

                {/* Header & Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Stethoscope className="w-6 h-6 text-sky-600" />
                            Doctor Workstation & OPD Dashboard
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Department: <span className="font-semibold text-slate-700">{currentDepartment}</span>{" "}
                            {user && (
                                <>| Doctor: <span className="font-semibold text-slate-700">{user.fullName}</span></>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={() => { fetchQueue(); fetchDoctorOverviewData(); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh Queue
                    </button>
                </div>

                {/* Quick KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-3 bg-sky-50 text-sky-600 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Waiting Queue</p>
                            <p className="text-xl font-bold text-slate-800">{waitingPatients.length}</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">In Consultation</p>
                            <p className="text-xl font-bold text-slate-800">{inConsultationPatients.length}</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                            <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Pending Lab Results</p>
                            <p className="text-xl font-bold text-slate-800">{pendingLabCount}</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-3 bg-slate-100 text-sky-600 rounded-lg">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Pending Radiology</p>
                            <p className="text-xl font-bold text-slate-800">{pendingRadCount}</p>
                        </div>
                    </div>
                </div>

                {/* Main Workstation Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column (2 Cols): Active Patient & Waiting Queue */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Active Patient Card */}
                        <div className="bg-gradient-to-r from-sky-900 to-slate-900 text-white p-5 rounded-xl shadow-md space-y-4">
                            <div className="flex items-center justify-between border-b border-sky-800/60 pb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                                    <UserCheck className="w-4 h-4 text-emerald-400" /> Active Consultation
                                </span>
                                {inConsultationPatients.length > 0 && (
                                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-bold">
                                        IN PROGRESS
                                    </span>
                                )}
                            </div>

                            {inConsultationPatients.length === 0 ? (
                                <div className="py-6 text-center text-slate-300 space-y-2">
                                    <p className="text-xs">No active consultation session.</p>
                                    <p className="text-xs text-sky-200">Select a patient from the waiting queue to begin clinical examination.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono bg-sky-800 text-sky-100 px-2 py-0.5 rounded text-xs font-bold">
                                                {inConsultationPatients[0].ticketNumber}
                                            </span>
                                            <h2 className="text-lg font-bold">{inConsultationPatients[0].patientName}</h2>
                                        </div>
                                        <p className="text-xs text-sky-200 font-mono">
                                            MRN: {inConsultationPatients[0].patientMrn}
                                        </p>
                                    </div>

                                    <Link
                                        href={`/doctor/consultation/${inConsultationPatients[0].id}`}
                                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        Open Clinical Record <ArrowUpRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Waiting Queue List */}
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-sky-600" />
                                    Waiting Queue ({waitingPatients.length})
                                </h2>
                                {emergencyCount > 0 && (
                                    <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                        {emergencyCount} Emergency
                                    </span>
                                )}
                            </div>

                            {loadingQueue ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
                                </div>
                            ) : waitingPatients.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-xs">
                                    No patients currently waiting in queue.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {waitingPatients.map((patient) => (
                                        <div
                                            key={patient.id}
                                            className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded transition"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-sky-700 text-xs bg-sky-50 px-2 py-0.5 rounded">
                                                        {patient.ticketNumber}
                                                    </span>
                                                    <span className="font-bold text-slate-800 text-sm">{patient.patientName}</span>
                                                    {patient.triagePriority !== "NORMAL" && (
                                                        <span
                                                            className={`text-[10px] font-bold px-1.5 rounded uppercase ${
                                                                patient.triagePriority === "EMERGENCY"
                                                                    ? "bg-rose-600 text-white"
                                                                    : "bg-amber-100 text-amber-800"
                                                            }`}
                                                        >
                                                            {patient.triagePriority}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 font-mono">
                                                    MRN: {patient.patientMrn} • Waiting since{" "}
                                                    {new Date(patient.arrivalTime).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                                {patient.chiefComplaint && (
                                                    <p className="text-xs text-slate-400 italic truncate max-w-xs">
                                                        &ldquo;{patient.chiefComplaint}&rdquo;
                                                    </p>
                                                )}
                                            </div>

                                            <Link
                                                href={`/doctor/consultation/${patient.id}`}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded transition flex items-center gap-1"
                                            >
                                                Call / Start <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column (1 Col): Pending Lab / Radiology Results Alert Panel */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-purple-600" />
                                Pending Results
                            </h2>
                            <span className="text-[11px] font-semibold text-slate-400">Needs Review</span>
                        </div>

                        {loadingResults ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
                            </div>
                        ) : pendingResults.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                                <p>All laboratory and radiology reports reviewed.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingResults.map((result) => (
                                    <div
                                        key={result.id}
                                        className={`p-3 rounded-lg border text-xs space-y-2 transition ${
                                            result.status === "CRITICAL"
                                                ? "bg-rose-50 border-rose-200"
                                                : "bg-slate-50 border-slate-200"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800">{result.patientName}</span>
                                            <span className="font-mono text-[10px] text-slate-500">{result.patientMrn}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                            {result.type === "LAB" ? (
                                                <FlaskConical className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                            ) : (
                                                <Radio className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                            )}
                                            <span className="truncate">{result.testName}</span>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                                            <span className="text-slate-400">
                                                {new Date(result.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            <Link
                                                href={result.type === "LAB" ? `/lab/results/${result.id}` : `/radiology/report/${result.id}`}
                                                className="font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5"
                                            >
                                                Review Report <ChevronRight className="w-3 h-3" />
                                            </Link>
                                        </div>
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