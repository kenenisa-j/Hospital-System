"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    Users,
    Clock,
    CheckCircle2,
    UserCheck,
    Search,
    PlusCircle,
    RefreshCw,
    Loader2,
    Building2,
    Stethoscope,
    XCircle,
    AlertCircle,
    TrendingUp,
} from "lucide-react";

// --- Types ---
type QueueStatus = "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED";

interface QueueEntry {
    id: string;
    ticketNumber: string;
    patientName: string;
    patientMrn: string;
    patientPhone: string;
    department: string;
    assignedDoctor?: string;
    status: QueueStatus;
    arrivalTime: string;
    waitTimeMinutes: number;
}

interface QueueMetrics {
    totalVisitsToday: number;
    currentlyWaiting: number;
    inConsultation: number;
    completedToday: number;
    avgWaitTimeMinutes: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// --- Demo / Mock Data (shown when API is unavailable) ---


export default function ReceptionDashboardPage() {
    const EMPTY_METRICS: QueueMetrics = { totalVisitsToday: 0, currentlyWaiting: 0, inConsultation: 0, completedToday: 0, avgWaitTimeMinutes: 0 };
    const [metrics, setMetrics] = useState<QueueMetrics>(EMPTY_METRICS);
    const [queueList, setQueueList] = useState<QueueEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [deptFilter, setDeptFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Fetch real-time dashboard state
    const fetchDashboardData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/reception/daily-summary`, {
                credentials: "include",
            });

            if (!res.ok) throw new Error(`Server responded with ${res.status}`);

            const data = await res.json();
            setMetrics(data.metrics || EMPTY_METRICS);
            setQueueList(data.queues || []);
        } catch (err: any) {
            setErrorMsg(err.message || 'Could not load dashboard data.');
            setMetrics(EMPTY_METRICS);
            setQueueList([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Polling every 15 seconds for real-time queue synchronization
    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(() => {
            fetchDashboardData(true);
        }, 15000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    // Status Badge Helper
    const getStatusBadge = (status: QueueStatus) => {
        switch (status) {
            case "WAITING":
                return (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Waiting
                    </span>
                );
            case "IN_CONSULTATION":
                return (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1 w-fit">
                        <Stethoscope className="w-3 h-3 text-sky-600" />
                        In Consultation
                    </span>
                );
            case "COMPLETED":
                return (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Completed
                    </span>
                );
            case "CANCELLED":
                return (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Cancelled
                    </span>
                );
            default:
                return null;
        }
    };

    // Filtering Logic
    const filteredQueue = queueList.filter((item) => {
        const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
        const matchesDept = deptFilter === "ALL" || item.department === deptFilter;
        const matchesSearch =
            item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.patientMrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesStatus && matchesDept && matchesSearch;
    });

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "RECEPTIONIST"]}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">

                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-sky-600" />
                            Reception Desk & Live Queue Hub
                        </h1>
                        <p className="text-sm text-slate-500">
                            Track walk-in arrivals, daily visit volume, real-time waiting times, and active consultations.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchDashboardData(true)}
                            disabled={refreshing}
                            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5"
                            title="Refresh Queue Data"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>

                        <Link
                            href="/reception/visits/new"
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Check-in Patient
                        </Link>

                        <Link
                            href="/reception/register"
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1.5"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Register Patient
                        </Link>
                    </div>
                </div>



                {/* Real-time KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Visits Today</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-900">{metrics.totalVisitsToday}</span>
                            <Users className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-amber-200 bg-amber-50/30 shadow-sm space-y-1">
                        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Waiting Patients</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-amber-900">{metrics.currentlyWaiting}</span>
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-sky-200 bg-sky-50/30 shadow-sm space-y-1">
                        <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider block">In Consultation</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-sky-900">{metrics.inConsultation}</span>
                            <Stethoscope className="w-5 h-5 text-sky-500" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-emerald-200 bg-emerald-50/30 shadow-sm space-y-1">
                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Completed</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-emerald-900">{metrics.completedToday}</span>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>

                    <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Avg Wait Time</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-900">{metrics.avgWaitTimeMinutes} <span className="text-xs font-normal text-slate-500">min</span></span>
                            <TrendingUp className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* Live Queue Directory Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-4">

                    {/* Controls Header */}
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center justify-between bg-slate-50/50">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search ticket, name, or MRN..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="WAITING">Waiting</option>
                                <option value="IN_CONSULTATION">In Consultation</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>

                            <select
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                <option value="ALL">All Departments</option>
                                <option value="General OPD">General OPD</option>
                                <option value="Pediatrics">Pediatrics</option>
                                <option value="Internal Medicine">Internal Medicine</option>
                                <option value="Emergency">Emergency</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3">
                            <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                            <p className="text-xs font-semibold text-slate-500">Loading daily queue feed...</p>
                        </div>
                    ) : filteredQueue.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-xs space-y-1">
                            <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="font-semibold text-slate-600">No matching Queue records found.</p>
                            <p>Check filters or issue a new visit ticket for today.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-3">Ticket #</th>
                                        <th className="p-3">Patient Details</th>
                                        <th className="p-3">Department</th>
                                        <th className="p-3">Assigned Provider</th>
                                        <th className="p-3">Arrival Time</th>
                                        <th className="p-3">Wait Time</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredQueue.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                            <td className="p-3 font-mono font-bold text-sky-800">
                                                {item.ticketNumber}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-900">{item.patientName}</div>
                                                <div className="text-[11px] text-slate-400 font-mono">MRN: {item.patientMrn}</div>
                                            </td>
                                            <td className="p-3 font-medium text-slate-700">
                                                {item.department}
                                            </td>
                                            <td className="p-3 text-slate-600">
                                                {item.assignedDoctor || <span className="text-slate-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="p-3 text-slate-500">
                                                {new Date(item.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-3">
                                                <span className={`font-semibold ${item.waitTimeMinutes > 30 ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                                                    {item.waitTimeMinutes} mins
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                {getStatusBadge(item.status)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}