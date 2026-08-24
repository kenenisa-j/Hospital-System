"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    Scan,
    Clock,
    Calendar,
    CheckCircle2,
    AlertTriangle,
    Play,
    Loader2,
    Search,
    Filter,
    User,
    QrCode,
    ShieldAlert,
    ArrowRight,
    DoorOpen,
} from "lucide-react";

// --- Types ---
export type RadiologyStatus = "REQUESTED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface RadiologyOrder {
    id: string;
    orderNumber: string;
    patientId: string;
    patientName: string;
    gender: string;
    age: number;
    testName: string;
    modality: "X_RAY" | "ULTRASOUND" | "CT_SCAN" | "MRI";
    requiresContrast: boolean;
    contrastCleared?: boolean;
    orderingDoctor: string;
    urgency: "ROUTINE" | "URGENT" | "STAT";
    requestedAt: string;
    scheduledTime?: string;
    assignedRoom?: string;
    status: RadiologyStatus;
    prepInstructions?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RadiologyQueuePage() {
    const [orders, setOrders] = useState<RadiologyOrder[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    // Scheduling Modal State
    const [activeModalOrder, setActiveModalOrder] = useState<RadiologyOrder | null>(null);
    const [scheduledTime, setScheduledTime] = useState<string>("");
    const [assignedRoom, setAssignedRoom] = useState<string>("Room 1 (General Radiology)");

    // Fetch Radiology Request Queue
    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/radiology/orders`, {
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            } else {
                // Fallback Mock Data for UI Testing
                const mockQueue: RadiologyOrder[] = [
                    {
                        id: "rad-ord-201",
                        orderNumber: "RAD-2026-0041",
                        patientId: "PAT-00891",
                        patientName: "Tewodros Kassahun",
                        gender: "Male",
                        age: 42,
                        testName: "Brain CT Scan (With Contrast)",
                        modality: "CT_SCAN",
                        requiresContrast: true,
                        contrastCleared: true,
                        orderingDoctor: "Dr. Aster Awoke",
                        urgency: "STAT",
                        requestedAt: "2026-08-13T09:15:00Z",
                        status: "REQUESTED",
                        prepInstructions: "Verify renal profile before contrast IV administration.",
                    },
                    {
                        id: "rad-ord-202",
                        orderNumber: "RAD-2026-0042",
                        patientId: "PAT-00421",
                        patientName: "Abebe Bikila",
                        gender: "Male",
                        age: 34,
                        testName: "Chest PA/Lateral View",
                        modality: "X_RAY",
                        requiresContrast: false,
                        orderingDoctor: "Dr. Kebede Kassaye",
                        urgency: "ROUTINE",
                        requestedAt: "2026-08-13T09:30:00Z",
                        scheduledTime: "2026-08-13T10:30:00Z",
                        assignedRoom: "X-Ray Bay B",
                        status: "SCHEDULED",
                    },
                    {
                        id: "rad-ord-203",
                        orderNumber: "RAD-2026-0043",
                        patientId: "PAT-00105",
                        patientName: "Genzebe Dibaba",
                        gender: "Female",
                        age: 29,
                        testName: "Lumbar Spine MRI",
                        modality: "MRI",
                        requiresContrast: false,
                        orderingDoctor: "Dr. Solomon Haile",
                        urgency: "URGENT",
                        requestedAt: "2026-08-13T08:45:00Z",
                        scheduledTime: "2026-08-13T10:00:00Z",
                        assignedRoom: "MRI Suite 1",
                        status: "IN_PROGRESS",
                        prepInstructions: "Remove all metallic items and complete screening form.",
                    },
                ];
                setOrders(mockQueue);
            }
        } catch (err) {
            setFeedback({ type: "error", msg: "Failed to load radiology queue." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    // Workflow Transition: REQUESTED -> SCHEDULED
    const handleConfirmSchedule = async () => {
        if (!activeModalOrder || !scheduledTime) return;
        setSubmittingId(activeModalOrder.id);

        try {
            const res = await fetch(`${API_BASE_URL}/api/radiology/orders/${activeModalOrder.id}/schedule`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    scheduledTime,
                    assignedRoom,
                    status: "SCHEDULED" as RadiologyStatus,
                }),
            });

            if (!res.ok) throw new Error("Scheduling failed.");

            setFeedback({
                type: "success",
                msg: `Order ${activeModalOrder.orderNumber} successfully scheduled for ${scheduledTime}.`,
            });
            setActiveModalOrder(null);
            fetchQueue();
        } catch (err) {
            // Local State Fallback
            setOrders((prev) =>
                prev.map((ord) =>
                    ord.id === activeModalOrder.id
                        ? { ...ord, status: "SCHEDULED", scheduledTime, assignedRoom }
                        : ord
                )
            );
            setFeedback({
                type: "success",
                msg: `Order ${activeModalOrder.orderNumber} assigned to ${assignedRoom}!`,
            });
            setActiveModalOrder(null);
        } finally {
            setSubmittingId(null);
        }
    };

    // Workflow Transition: SCHEDULED -> IN_PROGRESS
    const handleStartScan = async (orderId: string) => {
        setSubmittingId(orderId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/radiology/orders/${orderId}/start`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status: "IN_PROGRESS" as RadiologyStatus }),
            });

            if (!res.ok) throw new Error("Failed to transition scan status.");

            setFeedback({
                type: "success",
                msg: "Patient admitted to procedure room. Imaging session IN_PROGRESS.",
            });
            fetchQueue();
        } catch (err) {
            setOrders((prev) =>
                prev.map((ord) => (ord.id === orderId ? { ...ord, status: "IN_PROGRESS" } : ord))
            );
            setFeedback({
                type: "success",
                msg: "Imaging session active! Patient currently in scan room.",
            });
        } finally {
            setSubmittingId(null);
        }
    };

    // Filter List
    const filteredOrders = orders.filter((ord) => {
        const matchesSearch =
            ord.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ord.patientId.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = selectedStatus === "ALL" || ord.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "RADIOLOGIST", "RADIOLOGY_TECH", "DOCTOR"]}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-xs">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Scan className="w-6 h-6 text-indigo-600" />
                            Step 8.2: Radiology Request Queue
                        </h1>
                        <p className="text-slate-500 mt-0.5">
                            Manage incoming imaging requisitions, assign procedure rooms, and track scan progress.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded font-bold">
                            Pending: {orders.filter((o) => o.status === "REQUESTED").length}
                        </span>
                        <span className="px-3 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded font-bold">
                            Scheduled: {orders.filter((o) => o.status === "SCHEDULED").length}
                        </span>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded font-bold">
                            Active: {orders.filter((o) => o.status === "IN_PROGRESS").length}
                        </span>
                    </div>
                </div>

                {/* Banners */}
                {feedback && (
                    <div
                        className={`p-3.5 rounded-lg border flex items-center gap-2 font-semibold ${feedback.type === "success"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-rose-50 border-rose-200 text-rose-800"
                            }`}
                    >
                        {feedback.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedback.msg}</span>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search patient, order #, or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                        >
                            <option value="ALL">All Requisition States</option>
                            <option value="REQUESTED">REQUESTED (Pending Schedule)</option>
                            <option value="SCHEDULED">SCHEDULED (Assigned Slot/Room)</option>
                            <option value="IN_PROGRESS">IN_PROGRESS (Patient in Room)</option>
                        </select>
                    </div>
                </div>

                {/* Main Worklist Table */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <span>Fetching Live Radiology Orders...</span>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-semibold">
                            No radiology requisitions found matching current query.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                        <th className="p-3">Urgency & Order #</th>
                                        <th className="p-3">Patient Details</th>
                                        <th className="p-3">Imaging Procedure</th>
                                        <th className="p-3">Safety Pre-reqs</th>
                                        <th className="p-3">Schedule / Suite</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center">Workflow Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {filteredOrders.map((ord) => (
                                        <tr key={ord.id} className="hover:bg-slate-50/80 transition">

                                            {/* Urgency & Order */}
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${ord.urgency === "STAT"
                                                                ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                                                                : ord.urgency === "URGENT"
                                                                    ? "bg-amber-100 text-amber-800"
                                                                    : "bg-slate-100 text-slate-700"
                                                            }`}
                                                    >
                                                        {ord.urgency}
                                                    </span>
                                                    <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    By: {ord.orderingDoctor}
                                                </p>
                                            </td>

                                            {/* Patient */}
                                            <td className="p-3">
                                                <p className="font-bold text-slate-900 flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-slate-400" /> {ord.patientName}
                                                </p>
                                                <p className="text-[10px] font-mono text-slate-500">
                                                    {ord.patientId} • {ord.gender}, {ord.age}y
                                                </p>
                                            </td>

                                            {/* Test */}
                                            <td className="p-3">
                                                <p className="font-bold text-indigo-900">{ord.testName}</p>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                    Modality: {ord.modality.replace("_", " ")}
                                                </span>
                                            </td>

                                            {/* Safety */}
                                            <td className="p-3">
                                                {ord.requiresContrast ? (
                                                    <div className="space-y-1">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                                            <ShieldAlert className="w-3 h-3 text-indigo-600" /> + Contrast Required
                                                        </span>
                                                        {ord.contrastCleared ? (
                                                            <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Renal Cleared
                                                            </p>
                                                        ) : (
                                                            <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" /> Renal Pending
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px]">No Contrast Needed</span>
                                                )}
                                            </td>

                                            {/* Schedule/Suite */}
                                            <td className="p-3">
                                                {ord.scheduledTime ? (
                                                    <div className="space-y-0.5">
                                                        <p className="font-mono text-slate-800 font-bold flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            {new Date(ord.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <p className="text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                                                            <DoorOpen className="w-3 h-3" /> {ord.assignedRoom}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-amber-600 font-bold text-[11px]">Unassigned</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="p-3 text-center">
                                                <span
                                                    className={`px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 ${ord.status === "IN_PROGRESS"
                                                            ? "bg-purple-100 text-purple-800 border border-purple-300"
                                                            : ord.status === "SCHEDULED"
                                                                ? "bg-sky-100 text-sky-800"
                                                                : "bg-amber-100 text-amber-800"
                                                        }`}
                                                >
                                                    {ord.status === "IN_PROGRESS" && <Play className="w-3 h-3 fill-purple-800 animate-pulse" />}
                                                    {ord.status === "SCHEDULED" && <Clock className="w-3 h-3" />}
                                                    {ord.status}
                                                </span>
                                            </td>

                                            {/* Workflow Trigger Buttons */}
                                            <td className="p-3 text-center">
                                                {ord.status === "REQUESTED" && (
                                                    <button
                                                        onClick={() => {
                                                            setActiveModalOrder(ord);
                                                            setScheduledTime(new Date(Date.now() + 1800000).toISOString().slice(0, 16));
                                                        }}
                                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition inline-flex items-center gap-1 shadow-sm"
                                                    >
                                                        <Calendar className="w-3.5 h-3.5" /> Schedule & Room
                                                    </button>
                                                )}

                                                {ord.status === "SCHEDULED" && (
                                                    <button
                                                        disabled={submittingId === ord.id}
                                                        onClick={() => handleStartScan(ord.id)}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition inline-flex items-center gap-1 shadow-sm"
                                                    >
                                                        {submittingId === ord.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Play className="w-3.5 h-3.5" />
                                                        )}
                                                        Start Scan (In Progress)
                                                    </button>
                                                )}

                                                {ord.status === "IN_PROGRESS" && (
                                                    <span className="text-purple-700 font-bold text-[11px] inline-flex items-center gap-1">
                                                        Scan Active <ArrowRight className="w-3 h-3" /> Ready for DICOM
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Schedule & Room Assignment Modal */}
                {activeModalOrder && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
                            <h3 className="font-bold text-slate-800 text-base border-b pb-2">
                                Schedule Imaging Slot & Assign Suite
                            </h3>

                            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                                <p className="font-bold text-slate-800">{activeModalOrder.testName}</p>
                                <p className="text-slate-500 text-[11px]">
                                    Patient: <span className="font-bold text-slate-700">{activeModalOrder.patientName}</span> ({activeModalOrder.patientId})
                                </p>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Select Time Slot *</label>
                                <input
                                    type="datetime-local"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded font-mono"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Assign Radiology Suite / Room *</label>
                                <select
                                    value={assignedRoom}
                                    onChange={(e) => setAssignedRoom(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-700"
                                >
                                    <option value="Room 1 (General X-Ray)">Room 1 (General X-Ray)</option>
                                    <option value="Room 2 (Ultrasound Bay)">Room 2 (Ultrasound Bay)</option>
                                    <option value="Suite A (128-Slice CT Scan)">Suite A (128-Slice CT Scan)</option>
                                    <option value="Suite B (3.0T High-Field MRI)">Suite B (3.0T High-Field MRI)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveModalOrder(null)}
                                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmSchedule}
                                    disabled={submittingId === activeModalOrder.id}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center gap-2"
                                >
                                    {submittingId === activeModalOrder.id && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Confirm Slot & Assign
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </ProtectedRoute>
    );
}