"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getErrorMessage } from "@/lib/utils";
import {
    Pill,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    UserCheck,
    ShieldCheck,
    Loader2,
    AlertCircle
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface DispensedMedication {
    prescriptionItemId: string;
    medicationName: string;
    dosage: string;
    route: string;
    frequency: string;
    dispensedQuantity: number;
    remainingDoses: number;
    lastAdministered: string | null;
}

interface AdminLog {
    id: string;
    medicationName: string;
    dosage: string;
    route: string;
    status: "ADMINISTERED" | "REFUSED" | "HELD";
    administeredBy: string;
    administeredAt: string;
}

export default function MedicationExecutionForm({ admissionId }: { admissionId: string }) {
    const [meds] = useState<DispensedMedication[]>([]);
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [selectedMed, setSelectedMed] = useState<DispensedMedication | null>(null);
    const [actionStatus, setActionStatus] = useState<"ADMINISTERED" | "REFUSED" | "HELD">("ADMINISTERED");
    const [reason, setReason] = useState("");
    const [administeredBy, setAdministeredBy] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!admissionId) return;
        setLoadingHistory(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/medications/history/${admissionId}`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.history || []);
            }
        } catch (err) {
            console.error("Failed to fetch medication history:", err);
        } finally {
            setLoadingHistory(false);
        }
    }, [admissionId]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const handleAdminister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMed) return;
        if (!administeredBy.trim()) { setSubmitError("Please enter the administering nurse's name."); return; }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/medications/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    admissionId,
                    prescriptionItemId: selectedMed.prescriptionItemId,
                    medicationName: selectedMed.medicationName,
                    dosageGiven: selectedMed.dosage,
                    route: selectedMed.route,
                    status: actionStatus,
                    reasonForHoldOrRefusal: actionStatus !== "ADMINISTERED" ? reason : undefined,
                    administeredBy,
                }),
            });

            if (res.ok) {
                setSelectedMed(null);
                setReason("");
                fetchHistory();
            } else {
                const err = await res.json();
                setSubmitError(getErrorMessage(err.error, "Failed to log administration."));
            }
        } catch (err) {
            setSubmitError("A network error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto p-6 bg-slate-50 min-h-screen text-slate-800">

            {/* Left 2-Cols: Active Medication Orders */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Pill className="w-5 h-5 text-indigo-600" /> Active Pharmacy-Dispensed Orders
                        </h2>
                        <p className="text-xs text-slate-500">Select a verified medication to execute administration or log hold/refusal.</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Pharmacy Verified
                    </span>
                </div>

                {meds.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-400">
                        <Pill className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                        <p className="text-sm font-semibold">No active dispensed medications for this admission.</p>
                        <p className="text-xs mt-1">Medications will appear here once the pharmacy dispenses them.</p>
                    </div>
                ) : (
                <div className="space-y-3">
                    {meds.map((med) => (
                        <div
                            key={med.prescriptionItemId}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition flex justify-between items-center"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm text-slate-800">{med.medicationName}</h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                                        {med.route}
                                    </span>
                                </div>

                                <div className="flex gap-4 text-xs text-slate-500 font-medium">
                                    <span>Dose: <strong className="text-slate-700">{med.dosage}</strong></span>
                                    <span>Freq: <strong className="text-slate-700">{med.frequency}</strong></span>
                                    <span>Stock: <strong className="text-slate-700">{med.remainingDoses} doses left</strong></span>
                                </div>

                                <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                                    <Clock className="w-3 h-3 text-slate-400" /> Last Given: {med.lastAdministered || "Not given yet"}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedMed(med)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                                Log Execution
                            </button>
                        </div>
                    ))}
                </div>
                )}
            </div>

            {/* Right Col: Modal Input / Audit Trail */}
            <div className="space-y-4">
                {selectedMed ? (
                    <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-md space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <span className="text-[10px] font-bold uppercase text-indigo-600 block">Execute Order</span>
                            <h3 className="font-bold text-sm text-slate-800">{selectedMed.medicationName}</h3>
                            <p className="text-xs text-slate-500">{selectedMed.dosage} — {selectedMed.route}</p>
                        </div>

                        <form onSubmit={handleAdminister} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Administering Nurse *</label>
                                <input
                                    type="text"
                                    value={administeredBy}
                                    onChange={(e) => setAdministeredBy(e.target.value)}
                                    placeholder="e.g. Sister Tigist (RN)"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status Action</label>
                                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setActionStatus("ADMINISTERED")}
                                        className={`py-1 text-xs font-bold rounded ${actionStatus === "ADMINISTERED" ? "bg-emerald-600 text-white" : "text-slate-600"}`}
                                    >
                                        Given
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActionStatus("HELD")}
                                        className={`py-1 text-xs font-bold rounded ${actionStatus === "HELD" ? "bg-amber-600 text-white" : "text-slate-600"}`}
                                    >
                                        Hold
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActionStatus("REFUSED")}
                                        className={`py-1 text-xs font-bold rounded ${actionStatus === "REFUSED" ? "bg-rose-600 text-white" : "text-slate-600"}`}
                                    >
                                        Refused
                                    </button>
                                </div>
                            </div>

                            {actionStatus !== "ADMINISTERED" && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reason for Hold/Refusal *</label>
                                    <textarea
                                        required
                                        rows={2}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Provide clinical reason (e.g. NPO status, patient refused)..."
                                        className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            )}

                            {submitError && (
                                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> {submitError}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button type="button" onClick={() => { setSelectedMed(null); setSubmitError(null); }}
                                    className="w-1/2 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1">
                                    {submitting ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</> : "Confirm Log"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <UserCheck className="w-4 h-4 text-indigo-600" /> Recent Administration Audit Logs
                        </h3>

                        {loadingHistory ? (
                            <div className="py-4 flex items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                <span className="text-xs">Loading history...</span>
                            </div>
                        ) : logs.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No medications logged for this admission.</p>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {logs.map((log: any) => (
                                    <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-800">{log.medicationName}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${log.status === "ADMINISTERED" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                                {log.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-500">
                                            <span>{log.administeredBy}</span>
                                            <span>{new Date(log.administeredAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}