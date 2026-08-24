"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getErrorMessage } from "@/lib/utils";
import {
    FileText,
    Send,
    Clock,
    User,
    AlertCircle,
    CheckCircle2,
    ShieldAlert,
    Loader2
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface NoteEntry {
    id: string;
    shiftType: string;
    category: string;
    noteContent: string;
    patientCondition: "STABLE" | "IMPROVING" | "CRITICAL" | "GUARDED";
    nurseName: string;
    createdAt: string;
}

export default function NursingNotesForm({ admissionId }: { admissionId: string }) {
    const [notes, setNotes] = useState<NoteEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [form, setForm] = useState({
        shiftType: "DAY",
        category: "GENERAL_OBSERVATION",
        patientCondition: "STABLE",
        noteContent: "",
        nurseName: "",
        nurseId: "",
    });

    const fetchNotes = useCallback(async () => {
        if (!admissionId) return;
        setFetching(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/notes/${admissionId}`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setNotes(data.notes || []);
            }
        } catch (err) {
            console.error("Failed to fetch nursing notes:", err);
        } finally {
            setFetching(false);
        }
    }, [admissionId]);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    const getConditionBadge = (condition: string) => {
        switch (condition) {
            case "CRITICAL": return "bg-rose-100 text-rose-700 border-rose-200";
            case "GUARDED": return "bg-amber-100 text-amber-700 border-amber-200";
            case "IMPROVING": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            default: return "bg-indigo-100 text-indigo-700 border-indigo-200";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.noteContent.trim()) return;
        if (!form.nurseName.trim()) { setErrorMsg("Please enter your name as the recording nurse."); return; }

        setLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    admissionId,
                    shiftType: form.shiftType,
                    category: form.category,
                    patientCondition: form.patientCondition,
                    noteContent: form.noteContent,
                    nurseName: form.nurseName,
                    nurseId: form.nurseId || form.nurseName,
                }),
            });

            if (res.ok) {
                setSuccessMsg("Nursing note saved successfully.");
                setForm({ ...form, noteContent: "" });
                fetchNotes();
            } else {
                const err = await res.json();
                setErrorMsg(getErrorMessage(err.error, "Failed to save nursing note."));
            }
        } catch (err) {
            setErrorMsg("A network error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto p-6 bg-slate-50 min-h-screen">
            {/* Form Section */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="mb-6 border-b border-slate-100 pb-3">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" /> Log Observation
                        </h2>
                        <p className="text-xs text-slate-500">Record daily patient progress and clinical response.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Shift</label>
                            <select
                                value={form.shiftType}
                                onChange={(e) => setForm({ ...form, shiftType: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="DAY">Day Shift</option>
                                <option value="NIGHT">Night Shift</option>
                                <option value="OVERTIME">Overtime</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Category</label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="GENERAL_OBSERVATION">General Observation</option>
                                <option value="POST_OP_CARE">Post-Op Care</option>
                                <option value="MEDICATION_RESPONSE">Medication Response</option>
                                <option value="CLINICAL_DECLINE">Clinical Decline</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Current Patient Status</label>
                            <select
                                value={form.patientCondition}
                                onChange={(e) => setForm({ ...form, patientCondition: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="STABLE">Stable</option>
                                <option value="IMPROVING">Improving</option>
                                <option value="GUARDED">Guarded</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nurse Name *</label>
                            <input
                                type="text"
                                value={form.nurseName}
                                onChange={(e) => setForm({ ...form, nurseName: e.target.value })}
                                placeholder="e.g. Nurse Sister Tigist"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Clinical Notes *</label>
                            <textarea
                                required
                                rows={5}
                                value={form.noteContent}
                                onChange={(e) => setForm({ ...form, noteContent: e.target.value })}
                                placeholder="Detail patient symptoms, care response, mobility, or subjective complaints..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                        </div>

                        {errorMsg && (
                            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
                            </div>
                        )}
                        {successMsg && (
                            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {successMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !form.noteContent.trim()}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Logging Note...</> : <><Send className="w-3.5 h-3.5" /> Save Progress Note</>}
                        </button>
                    </form>
                </div>
            </div>

            {/* Observation History Timeline */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" /> Observation Timeline
                    </h3>
                    <span className="text-xs text-slate-500 font-semibold">{notes.length} Total Entries</span>
                </div>

                {fetching ? (
                    <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-xs font-semibold">Loading observation history...</span>
                    </div>
                ) : notes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                        <FileText className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                        <p className="text-xs font-semibold">No nursing notes recorded for this admission yet.</p>
                    </div>
                ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {notes.map((note) => (
                        <div key={note.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 hover:border-slate-300 transition">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                        {note.shiftType} SHIFT
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">
                                        {note.category.replace("_", " ")}
                                    </span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getConditionBadge(note.patientCondition)}`}>
                                    {note.patientCondition}
                                </span>
                            </div>

                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {note.noteContent}
                            </p>

                            <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-200/60">
                                <span className="flex items-center gap-1 text-slate-600 font-semibold">
                                    <User className="w-3 h-3 text-indigo-500" /> {note.nurseName}
                                </span>
                                <span>{note.createdAt}</span>
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>
        </div>
    );
}