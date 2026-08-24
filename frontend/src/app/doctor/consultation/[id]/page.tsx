"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    Stethoscope,
    Activity,
    User,
    Heart,
    Thermometer,
    Wind,
    Weight,
    FileText,
    Save,
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    Loader2,
    Clock,
    ShieldAlert,
    FlaskConical,
    Plus,
    Trash2,
    Radio,
} from "lucide-react";

// --- Types ---
interface PatientInfo {
    id: string;
    mrn: string;
    fullName: string;
    age: number;
    gender: string;
    phoneNumber: string;
    allergies?: string[];
}

interface VisitContext {
    id: string;
    ticketNumber: string;
    department: string;
    triagePriority: "NORMAL" | "URGENT" | "EMERGENCY";
    createdAt: string;
    patient: PatientInfo;
}

interface VitalSigns {
    systolicBp: number | "";
    diastolicBp: number | "";
    temperature: number | ""; // Celsius
    heartRate: number | ""; // bpm
    spo2: number | ""; // %
    weight: number | ""; // kg
    height: number | ""; // cm
    respiratoryRate: number | ""; // breaths/min
}

interface ClinicalNotes {
    chiefComplaint: string;
    historyOfPresentIllness: string;
    pastMedicalHistory: string;
    physicalExamination: {
        generalAppearance: string;
        cardiovascular: string;
        respiratory: string;
        abdomen: string;
        neurological: string;
        otherNotes: string;
    };
}

interface ClinicalOrder {
    id: string;
    type: "LAB" | "RADIOLOGY" | "PRESCRIPTION";
    testName: string;
    urgency: "ROUTINE" | "URGENT" | "STAT";
    notes?: string;
    status: string;
    createdAt: string;
}

interface Diagnosis {
    id: string;
    icdCode?: string;
    description: string;
    type: "PRIMARY" | "SECONDARY" | "DIFFERENTIAL";
    createdAt: string;
}

interface CatalogItem {
    id: string;
    name: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ClinicalConsultationFormPage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params?.id as string;

    const [visit, setVisit] = useState<VisitContext | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Active Documentation Tab
    const [activeTab, setActiveTab] = useState<"VITALS" | "HISTORY" | "PHYSICAL" | "DIAGNOSTICS">("VITALS");

    // Vitals State
    const [vitals, setVitals] = useState<VitalSigns>({
        systolicBp: "",
        diastolicBp: "",
        temperature: "",
        heartRate: "",
        spo2: "",
        weight: "",
        height: "",
        respiratoryRate: "",
    });

    // Clinical History & Physical Exam State
    const [clinicalNotes, setClinicalNotes] = useState<ClinicalNotes>({
        chiefComplaint: "",
        historyOfPresentIllness: "",
        pastMedicalHistory: "",
        physicalExamination: {
            generalAppearance: "Well-developed, in no acute distress.",
            cardiovascular: "S1 and S2 present, normal rate and rhythm, no murmurs.",
            respiratory: "Clear to auscultation bilaterally, no wheezes or rales.",
            abdomen: "Soft, non-tender, non-distended, bowel sounds present.",
            neurological: "Alert and oriented x3, gross motor/sensory intact.",
            otherNotes: "",
        },
    });

    // Diagnostics & Orders State
    const [orders, setOrders] = useState<ClinicalOrder[]>([]);
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [labCatalogList, setLabCatalogList] = useState<CatalogItem[]>([]);
    const [radCatalogList, setRadCatalogList] = useState<CatalogItem[]>([]);

    // Form states for new diagnostics
    const [newOrderType, setNewOrderType] = useState<"LAB" | "RADIOLOGY">("LAB");
    const [placingOrder, setPlacingOrder] = useState<boolean>(false);
    const [newOrderName, setNewOrderName] = useState<string>("");
    const [newOrderUrgency, setNewOrderUrgency] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE");
    const [newOrderNotes, setNewOrderNotes] = useState<string>("");

    const [newDiagDesc, setNewDiagDesc] = useState<string>("");
    const [newDiagIcd, setNewDiagIcd] = useState<string>("");
    const [newDiagType, setNewDiagType] = useState<"PRIMARY" | "SECONDARY" | "DIFFERENTIAL">("PRIMARY");

    // Fetch Visit and Patient Context
    const fetchConsultationContext = useCallback(async () => {
        if (!visitId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/visits/${visitId}`, {
                credentials: "include",
            });
            // If unauthorized or forbidden, session has expired — redirect to login
            if (res.status === 401 || res.status === 403) {
                router.push("/login");
                return;
            }
            if (!res.ok) throw new Error("Could not load clinical visit context.");
            const data = await res.json();
            setVisit(data.visit);

            // Populate pre-existing vitals if recorded at triage
            if (data.visit.vitals) {
                setVitals(data.visit.vitals);
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred while loading visit details.");
        } finally {
            setLoading(false);
        }
    }, [visitId, router]);

    // Fetch placed orders, diagnoses, and catalog items
    const fetchDiagnosticsData = useCallback(async () => {
        if (!visitId) return;
        try {
            // Placed orders
            const ordersRes = await fetch(`${API_BASE_URL}/api/consultations/${visitId}/orders`, { credentials: "include" });
            if (ordersRes.ok) {
                const data = await ordersRes.json();
                setOrders(data.orders || []);
            }

            // Placed diagnoses
            const diagRes = await fetch(`${API_BASE_URL}/api/consultations/${visitId}/diagnoses`, { credentials: "include" });
            if (diagRes.ok) {
                const data = await diagRes.json();
                setDiagnoses(data.diagnoses || []);
            }

            // Lab catalog
            const labCatRes = await fetch(`${API_BASE_URL}/api/lab/catalog`, { credentials: "include" });
            if (labCatRes.ok) {
                const data = await labCatRes.json();
                setLabCatalogList((data.catalog || []).map((c: any) => ({ id: c.id, name: c.testName })));
            }

            // Radiology catalog
            const radCatRes = await fetch(`${API_BASE_URL}/api/radiology/catalog`, { credentials: "include" });
            if (radCatRes.ok) {
                const data = await radCatRes.json();
                setRadCatalogList((data.catalog || []).map((c: any) => ({ id: c.id, name: c.examName })));
            }
        } catch (err) {
            console.error("Failed to load diagnostic details:", err);
        }
    }, [visitId]);

    useEffect(() => {
        fetchConsultationContext();
        fetchDiagnosticsData();
    }, [fetchConsultationContext, fetchDiagnosticsData]);

    // Place a new order
    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrderName || placingOrder) return;
        setPlacingOrder(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/consultations/${visitId}/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    type: newOrderType,
                    testName: newOrderName,
                    urgency: newOrderUrgency,
                    notes: newOrderNotes,
                }),
            });

            if (res.status === 401 || res.status === 403) {
                setErrorMsg("Your session has expired. Please log out and log in again to continue.");
                return;
            }
            if (res.ok) {
                setNewOrderName("");
                setNewOrderNotes("");
                fetchDiagnosticsData();
            } else {
                const err = await res.json();
                setErrorMsg(err.error || "Failed to place diagnostic order.");
            }
        } catch (err) {
            setErrorMsg("Network error placing order.");
        } finally {
            setPlacingOrder(false);
        }
    };

    // Add a diagnosis
    const handleAddDiagnosis = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDiagDesc) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/consultations/${visitId}/diagnoses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    description: newDiagDesc,
                    icdCode: newDiagIcd || undefined,
                    type: newDiagType,
                }),
            });

            if (res.status === 401 || res.status === 403) {
                setErrorMsg("Your session has expired. Please log out and log in again to continue.");
                return;
            }
            if (res.ok) {
                setNewDiagDesc("");
                setNewDiagIcd("");
                fetchDiagnosticsData();
            } else {
                const err = await res.json();
                setErrorMsg(err.error || "Failed to save diagnosis.");
            }
        } catch (err) {
            setErrorMsg("Network error saving diagnosis.");
        }
    };

    // Dynamic Vital Abnormal Flag Helpers
    const isHighBp = (systolic: number | "", diastolic: number | "") => {
        if (typeof systolic === "number" && systolic >= 140) return true;
        if (typeof diastolic === "number" && diastolic >= 90) return true;
        return false;
    };

    const isLowSpo2 = (spo2: number | "") => {
        return typeof spo2 === "number" && spo2 > 0 && spo2 < 95;
    };

    const isHighFever = (temp: number | "") => {
        return typeof temp === "number" && temp >= 38.0;
    };

    // Submit Consultation Data
    const handleSaveConsultation = async () => {
        if (!clinicalNotes.chiefComplaint.trim()) {
            setErrorMsg("Chief Complaint is required before saving consultation notes.");
            setActiveTab("HISTORY");
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        const payload = {
            visitId,
            patientId: visit?.patient.id,
            vitals,
            clinicalNotes,
            status: "IN_PROGRESS",
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/consultations/${visitId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to save consultation encounter.");
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || "Could not complete saving consultation record.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-500">Loading Clinical Encounter File...</p>
            </div>
        );
    }

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
            <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">

                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/doctor/dashboard")}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Stethoscope className="w-6 h-6 text-sky-600" />
                                Clinical Encounter & Consultation Form
                            </h1>
                            <p className="text-xs text-slate-500">
                                Ticket Number: <span className="font-mono font-bold text-sky-700">{visit?.ticketNumber}</span> |{" "}
                                Department: <span className="font-semibold text-slate-700">{visit?.department}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveConsultation}
                            disabled={submitting}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-sm"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Notes...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Save Consultation
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Success Alert Banner */}
                {saveSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Consultation notes and vital signs saved successfully!</span>
                    </div>
                )}

                {/* Global Error Banner */}
                {errorMsg && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between gap-2 font-semibold">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setErrorMsg(null)}
                            className="text-xs underline hover:text-rose-900 shrink-0 ml-4"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Patient Summary Header Card */}
                <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                            {visit?.patient.fullName.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                {visit?.patient.fullName}
                                <span className="text-xs font-normal text-slate-300">
                                    ({visit?.patient.age} Y / {visit?.patient.gender})
                                </span>
                            </h2>
                            <p className="text-xs font-mono text-sky-300">MRN: {visit?.patient.mrn}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs border-t md:border-t-0 md:border-l border-slate-700 pt-3 md:pt-0 md:pl-6">
                        <div>
                            <span className="text-slate-400 block">Known Allergies:</span>
                            <p className="font-semibold text-rose-400 flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                {visit?.patient.allergies?.join(", ") || "No Known Drug Allergies (NKDA)"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section Navigation Tabs */}
                <div className="flex border-b border-slate-200 text-xs font-bold gap-2">
                    <button
                        onClick={() => setActiveTab("VITALS")}
                        className={`py-3 px-5 border-b-2 flex items-center gap-2 transition ${activeTab === "VITALS"
                            ? "border-sky-600 text-sky-700 bg-sky-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        <Activity className="w-4 h-4 text-sky-600" />
                        1. Vital Signs
                    </button>

                    <button
                        onClick={() => setActiveTab("HISTORY")}
                        className={`py-3 px-5 border-b-2 flex items-center gap-2 transition ${activeTab === "HISTORY"
                            ? "border-sky-600 text-sky-700 bg-sky-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        <FileText className="w-4 h-4 text-sky-600" />
                        2. Chief Complaint & History (HPI)
                    </button>

                    <button
                        onClick={() => setActiveTab("PHYSICAL")}
                        className={`py-3 px-5 border-b-2 flex items-center gap-2 transition ${activeTab === "PHYSICAL"
                            ? "border-sky-600 text-sky-700 bg-sky-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        <Stethoscope className="w-4 h-4 text-sky-600" />
                        3. Physical Examination
                    </button>

                    <button
                        onClick={() => setActiveTab("DIAGNOSTICS")}
                        className={`py-3 px-5 border-b-2 flex items-center gap-2 transition ${activeTab === "DIAGNOSTICS"
                            ? "border-sky-600 text-sky-700 bg-sky-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        <FlaskConical className="w-4 h-4 text-sky-600" />
                        4. Diagnostics & Orders
                    </button>
                </div>

                {/* TAB 1: Vital Signs Recording */}
                {activeTab === "VITALS" && (
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Activity className="w-4 h-4 text-sky-600" />
                            Patient Vital Signs & Triage Parameters
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                            {/* Blood Pressure */}
                            <div className={`p-4 rounded-lg border space-y-2 ${isHighBp(vitals.systolicBp, vitals.diastolicBp) ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-rose-500" /> Blood Pressure</span>
                                    <span className="text-[10px] text-slate-400">mmHg</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="Sys (120)"
                                        value={vitals.systolicBp}
                                        onChange={(e) => setVitals({ ...vitals, systolicBp: parseFloat(e.target.value) || "" })}
                                        className="w-full p-2 text-xs border border-slate-300 rounded font-bold text-center bg-white"
                                    />
                                    <span className="text-slate-400 font-bold">/</span>
                                    <input
                                        type="number"
                                        placeholder="Dia (80)"
                                        value={vitals.diastolicBp}
                                        onChange={(e) => setVitals({ ...vitals, diastolicBp: parseFloat(e.target.value) || "" })}
                                        className="w-full p-2 text-xs border border-slate-300 rounded font-bold text-center bg-white"
                                    />
                                </div>
                            </div>

                            {/* Temperature */}
                            <div className={`p-4 rounded-lg border space-y-2 ${isHighFever(vitals.temperature) ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span className="flex items-center gap-1"><Thermometer className="w-4 h-4 text-amber-500" /> Temperature</span>
                                    <span className="text-[10px] text-slate-400">°C</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="37.0"
                                    value={vitals.temperature}
                                    onChange={(e) => setVitals({ ...vitals, temperature: parseFloat(e.target.value) || "" })}
                                    className="w-full p-2 text-xs border border-slate-300 rounded font-bold text-center bg-white"
                                />
                            </div>

                            {/* Heart Rate */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-emerald-500" /> Heart Rate</span>
                                    <span className="text-[10px] text-slate-400">bpm</span>
                                </div>
                                <input
                                    type="number"
                                    placeholder="72"
                                    value={vitals.heartRate}
                                    onChange={(e) => setVitals({ ...vitals, heartRate: parseFloat(e.target.value) || "" })}
                                    className="w-full p-2 text-xs border border-slate-300 rounded font-bold text-center bg-white"
                                />
                            </div>

                            {/* SpO2 */}
                            <div className={`p-4 rounded-lg border space-y-2 ${isLowSpo2(vitals.spo2) ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span className="flex items-center gap-1"><Wind className="w-4 h-4 text-sky-500" /> SpO2 Saturation</span>
                                    <span className="text-[10px] text-slate-400">%</span>
                                </div>
                                <input
                                    type="number"
                                    placeholder="98"
                                    value={vitals.spo2}
                                    onChange={(e) => setVitals({ ...vitals, spo2: parseFloat(e.target.value) || "" })}
                                    className="w-full p-2 text-xs border border-slate-300 rounded font-bold text-center bg-white"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Chief Complaint & History */}
                {activeTab === "HISTORY" && (
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <FileText className="w-4 h-4 text-sky-600" />
                            Chief Complaint & Medical History
                        </h3>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">Chief Complaint (CC) *</label>
                            <input
                                type="text"
                                placeholder="e.g., Severe headache and fever"
                                value={clinicalNotes.chiefComplaint}
                                onChange={(e) => setClinicalNotes({ ...clinicalNotes, chiefComplaint: e.target.value })}
                                className="w-full p-2.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 font-semibold text-slate-800"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">History of Present Illness (HPI)</label>
                            <textarea
                                rows={5}
                                placeholder="Onset, severity, duration..."
                                value={clinicalNotes.historyOfPresentIllness}
                                onChange={(e) => setClinicalNotes({ ...clinicalNotes, historyOfPresentIllness: e.target.value })}
                                className="w-full p-3 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 text-slate-800"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">Past Medical History (PMH)</label>
                            <textarea
                                rows={3}
                                placeholder="Chronic illnesses, surgeries..."
                                value={clinicalNotes.pastMedicalHistory}
                                onChange={(e) => setClinicalNotes({ ...clinicalNotes, pastMedicalHistory: e.target.value })}
                                className="w-full p-3 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 text-slate-800"
                            />
                        </div>
                    </div>
                )}

                {/* TAB 3: Physical Examination */}
                {activeTab === "PHYSICAL" && (
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Stethoscope className="w-4 h-4 text-sky-600" />
                            Systemic Physical Examination Findings
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-slate-700 block">General Appearance</label>
                                <textarea
                                    rows={2}
                                    value={clinicalNotes.physicalExamination.generalAppearance}
                                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, physicalExamination: { ...clinicalNotes.physicalExamination, generalAppearance: e.target.value } })}
                                    className="w-full p-2 border border-slate-300 rounded bg-white"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-700 block">Cardiovascular System (CVS)</label>
                                <textarea
                                    rows={2}
                                    value={clinicalNotes.physicalExamination.cardiovascular}
                                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, physicalExamination: { ...clinicalNotes.physicalExamination, cardiovascular: e.target.value } })}
                                    className="w-full p-2 border border-slate-300 rounded bg-white"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-700 block">Respiratory System</label>
                                <textarea
                                    rows={2}
                                    value={clinicalNotes.physicalExamination.respiratory}
                                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, physicalExamination: { ...clinicalNotes.physicalExamination, respiratory: e.target.value } })}
                                    className="w-full p-2 border border-slate-300 rounded bg-white"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-700 block">Abdominal / GI</label>
                                <textarea
                                    rows={2}
                                    value={clinicalNotes.physicalExamination.abdomen}
                                    onChange={(e) => setClinicalNotes({ ...clinicalNotes, physicalExamination: { ...clinicalNotes.physicalExamination, abdomen: e.target.value } })}
                                    className="w-full p-2 border border-slate-300 rounded bg-white"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: Diagnostics & Placed Orders */}
                {activeTab === "DIAGNOSTICS" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Diagnoses Panel */}
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Stethoscope className="w-4 h-4 text-sky-600" />
                                ICD-10 Diagnoses & Encounter Types
                            </h3>

                            {/* Placed Diagnoses List */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {diagnoses.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No diagnoses recorded yet for this visit.</p>
                                ) : (
                                    diagnoses.map((d) => (
                                        <div key={d.id} className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-bold text-slate-800">{d.description}</p>
                                                {d.icdCode && <span className="font-mono text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-bold">ICD: {d.icdCode}</span>}
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                d.type === 'PRIMARY' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
                                            }`}>{d.type}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add Diagnosis Form */}
                            <form onSubmit={handleAddDiagnosis} className="space-y-3 pt-3 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-700 uppercase">Record New Diagnosis</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Description (e.g. Typhoid Fever)*"
                                        required
                                        value={newDiagDesc}
                                        onChange={(e) => setNewDiagDesc(e.target.value)}
                                        className="p-2 text-xs border border-slate-300 rounded bg-white font-medium col-span-2 sm:col-span-1"
                                    />
                                    <input
                                        type="text"
                                        placeholder="ICD-10 Code (e.g. A01.0)"
                                        value={newDiagIcd}
                                        onChange={(e) => setNewDiagIcd(e.target.value)}
                                        className="p-2 text-xs border border-slate-300 rounded bg-white font-medium col-span-2 sm:col-span-1"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={newDiagType}
                                        onChange={(e: any) => setNewDiagType(e.target.value)}
                                        className="text-xs border border-slate-300 rounded p-2 bg-white flex-1"
                                    >
                                        <option value="PRIMARY">Primary Diagnosis</option>
                                        <option value="SECONDARY">Secondary Diagnosis</option>
                                        <option value="DIFFERENTIAL">Differential Diagnosis</option>
                                    </select>
                                    <button type="submit" className="p-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold flex items-center gap-1 px-4">
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Placed Orders Panel */}
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <FlaskConical className="w-4 h-4 text-sky-600" />
                                Diagnostics Orders (Lab & Radiology)
                            </h3>

                            {/* Placed Orders List */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {orders.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No diagnostics orders placed yet for this visit.</p>
                                ) : (
                                    orders.map((o) => (
                                        <div key={o.id} className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center text-xs">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {o.type === 'LAB' ? <FlaskConical className="w-3.5 h-3.5 text-amber-500" /> : <Radio className="w-3.5 h-3.5 text-sky-500" />}
                                                    <p className="font-bold text-slate-800">{o.testName}</p>
                                                </div>
                                                {o.notes && <p className="text-slate-500 text-[10px] mt-0.5">&ldquo;{o.notes}&rdquo;</p>}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                                    o.urgency === 'STAT' ? 'bg-red-100 text-red-800 font-bold' : 'bg-slate-200 text-slate-700'
                                                }`}>{o.urgency}</span>
                                                <span className="text-[10px] text-slate-400 italic font-medium">{o.status}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Place New Order Form */}
                            <form onSubmit={handlePlaceOrder} className="space-y-3 pt-3 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-700 uppercase">Place New Order</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={newOrderType}
                                        onChange={(e: any) => {
                                            setNewOrderType(e.target.value);
                                            setNewOrderName("");
                                        }}
                                        className="text-xs border border-slate-300 rounded p-2 bg-white col-span-2 sm:col-span-1"
                                    >
                                        <option value="LAB">Lab Order (LAB)</option>
                                        <option value="RADIOLOGY">Radiology Order (RAD)</option>
                                    </select>

                                    {/* Test Selection Dropdown (populated from database catalogs) */}
                                    <select
                                        value={newOrderName}
                                        required
                                        onChange={(e) => setNewOrderName(e.target.value)}
                                        className="text-xs border border-slate-300 rounded p-2 bg-white col-span-2 sm:col-span-1"
                                    >
                                        <option value="">-- Choose Test / Exam * --</option>
                                        {(newOrderType === "LAB" ? labCatalogList : radCatalogList).map((item) => (
                                            <option key={item.id} value={item.name}>{item.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={newOrderUrgency}
                                        onChange={(e: any) => setNewOrderUrgency(e.target.value)}
                                        className="text-xs border border-slate-300 rounded p-2 bg-white"
                                    >
                                        <option value="ROUTINE">Urgency: Routine</option>
                                        <option value="URGENT">Urgency: Urgent</option>
                                        <option value="STAT">Urgency: STAT / Emergency</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Ordering notes (optional)"
                                        value={newOrderNotes}
                                        onChange={(e) => setNewOrderNotes(e.target.value)}
                                        className="p-2 text-xs border border-slate-300 rounded bg-white"
                                    />
                                </div>
                                <button type="submit" disabled={!newOrderName || placingOrder} className="w-full p-2 bg-sky-600 disabled:bg-slate-300 hover:bg-sky-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1">
                                    {placingOrder ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Placing Order...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" /> Place Diagnostic Order
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                    </div>
                )}

            </div>
        </ProtectedRoute>
    );
}