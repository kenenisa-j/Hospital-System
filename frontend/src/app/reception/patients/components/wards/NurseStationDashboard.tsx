"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Activity,
    Pill,
    Clock,
    CheckCircle2,
    AlertCircle,
    User,
    BedDouble,
    ClipboardList,
    ChevronRight,
    Loader2
} from "lucide-react";

interface PatientTask {
    id: string;
    patientName: string;
    bedNumber: string;
    mrn: string;
    taskTitle: string;
    type: "VITAL_CHECK" | "MEDICATION" | "LAB_DRAW" | "DRESSING_CHANGE";
    priority: "ROUTINE" | "URGENT" | "HIGH";
    dueTime: string;
    completed: boolean;
}

interface ScheduledMed {
    id: string;
    patientName: string;
    bedNumber: string;
    medication: string;
    dosage: string;
    route: string;
    dueTime: string;
    status: "PENDING" | "ADMINISTERED" | "SKIPPED";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function NurseStationDashboard() {
    const [tasks, setTasks] = useState<PatientTask[]>([]);
    const [meds, setMeds] = useState<ScheduledMed[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"TASKS" | "MAR">("TASKS");

    const fetchAdmissionsAndBuildTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/admissions`, { credentials: "include" });
            if (!res.ok) throw new Error(`Server returned code ${res.status}`);
            const data = await res.json();
            const list = data.admissions || [];

            // Generate dynamic tasks/MAR per admitted patient for demonstration/clinical workflow
            const generatedTasks: PatientTask[] = [];
            const generatedMeds: ScheduledMed[] = [];

            list.forEach((adm: any, idx: number) => {
                const bedLabel = adm.bedNumber || `Bed-${adm.bedId.substr(0, 4).toUpperCase()}`;
                
                // Vital Check Task
                generatedTasks.push({
                    id: `task-v-${adm.id}`,
                    patientName: adm.patientName,
                    bedNumber: bedLabel,
                    mrn: adm.mrn,
                    taskTitle: "Check Vital Signs (BP, Temp, SpO2)",
                    type: "VITAL_CHECK",
                    priority: "HIGH",
                    dueTime: "Routine Check",
                    completed: false
                });

                // General Dressing Task
                generatedTasks.push({
                    id: `task-d-${adm.id}`,
                    patientName: adm.patientName,
                    bedNumber: bedLabel,
                    mrn: adm.mrn,
                    taskTitle: "Clinical Observation & Note Entry",
                    type: "DRESSING_CHANGE",
                    priority: "ROUTINE",
                    dueTime: "Ongoing",
                    completed: false
                });

                // Medication scheduled
                generatedMeds.push({
                    id: `med-1-${adm.id}`,
                    patientName: adm.patientName,
                    bedNumber: bedLabel,
                    medication: "Prescribed IV Ceftriaxone / Oral meds",
                    dosage: "As directed",
                    route: "Surgical Ward protocol",
                    dueTime: "Q12H",
                    status: "PENDING"
                });
            });

            setTasks(generatedTasks);
            setMeds(generatedMeds);
        } catch (err: any) {
            setError(err.message || "Failed to load ward queue.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmissionsAndBuildTasks();
    }, [fetchAdmissionsAndBuildTasks]);

    const toggleTask = (id: string) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const markMedAdministered = (id: string) => {
        setMeds(meds.map(m => m.id === id ? { ...m, status: "ADMINISTERED" } : m));
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-800">
            {/* Station Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Nursing Station — Surgical Ward</h1>
                    <p className="text-sm text-slate-500">Active ward roster, scheduled medication, and nursing tasks.</p>
                </div>

                <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setActiveTab("TASKS")}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition ${activeTab === "TASKS" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                        Pending Tasks ({tasks.filter(t => !t.completed).length})
                    </button>
                    <button
                        onClick={() => setActiveTab("MAR")}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition ${activeTab === "MAR" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                        Medication Schedule (MAR)
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="ml-2 text-sm text-slate-500 font-semibold">Loading nurse station...</span>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
                    <p className="font-bold text-slate-700">Failed to load nurse station dashboard</p>
                    <p className="text-sm text-slate-400 mt-1">{error}</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                    <ClipboardList className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p className="font-bold text-slate-600">No Active Admitted Patients</p>
                    <p className="text-xs mt-1">When doctors admit patients to beds, their clinical tasks will populate here.</p>
                </div>
            ) : (
                /* Main View Grid */
                activeTab === "TASKS" ? (
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-indigo-600" /> Actionable Nursing Tasks
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`p-4 rounded-xl border bg-white shadow-sm flex flex-col justify-between transition ${task.completed ? "opacity-60 border-slate-200" : "border-slate-300 hover:border-indigo-300"
                                        }`}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1">
                                                <BedDouble className="w-3 h-3 text-indigo-600" /> {task.bedNumber}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${task.priority === "HIGH" || task.priority === "URGENT" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                                                }`}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-sm text-slate-800">{task.patientName}</h3>
                                        <p className="text-[11px] text-slate-400 mb-3">{task.mrn}</p>

                                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700 font-medium mb-4">
                                            {task.taskTitle}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Due: {task.dueTime}
                                        </span>

                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${task.completed
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                }`}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {task.completed ? "Done" : "Mark Done"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* MAR (Medication Administration Record) View */
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                            <Pill className="w-4 h-4 text-indigo-600" />
                            <h2 className="text-sm font-bold text-slate-700">Scheduled Medication Administration</h2>
                        </div>

                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b">
                                <tr>
                                    <th className="p-3">Bed & Patient</th>
                                    <th className="p-3">Medication</th>
                                    <th className="p-3">Dosage & Route</th>
                                    <th className="p-3">Due Time</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {meds.map((med) => (
                                    <tr key={med.id} className="hover:bg-slate-50 transition">
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800">{med.patientName}</div>
                                            <div className="text-[10px] text-indigo-600 font-semibold">{med.bedNumber}</div>
                                        </td>
                                        <td className="p-3 font-semibold text-slate-700">{med.medication}</td>
                                        <td className="p-3 text-slate-600">{med.dosage} ({med.route})</td>
                                        <td className="p-3 font-bold text-slate-700">{med.dueTime}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${med.status === "ADMINISTERED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                }`}>
                                                {med.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {med.status === "PENDING" ? (
                                                <button
                                                    onClick={() => markMedAdministered(med.id)}
                                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[11px]"
                                                >
                                                    Administer
                                                </button>
                                            ) : (
                                                <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1 justify-end">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Administered
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}