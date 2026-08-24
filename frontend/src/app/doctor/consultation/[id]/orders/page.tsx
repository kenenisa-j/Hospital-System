"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    Pill,
    FlaskConical,
    FileImage,
    UserPlus,
    Plus,
    Trash2,
    Save,
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    Loader2,
    ClipboardList,
} from "lucide-react";

// --- Types ---
interface PrescriptionItem {
    id: string;
    medicationName: string;
    dosage: string;
    route: string;
    frequency: string;
    duration: string;
    instructions: string;
}

interface LabOrder {
    id: string;
    testName: string;
    category: string;
    urgency: "ROUTINE" | "URGENT" | "STAT";
    clinicalNotes: string;
}

interface RadiologyOrder {
    id: string;
    modality: "X-RAY" | "ULTRASOUND" | "CT_SCAN" | "MRI";
    bodySite: string;
    reasonForExam: string;
    urgency: "ROUTINE" | "URGENT" | "STAT";
}

interface ReferralOrder {
    targetDepartment: string;
    priority: "ROUTINE" | "URGENT";
    reasonForReferral: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Common Preset Master Catalog
const PRESET_MEDICATIONS = ["Amoxicillin 500mg", "Paracetamol 500mg", "Ibuprofen 400mg", "Omeprazole 20mg", "Metformin 500mg", "Ciprofloxacin 500mg"];
const PRESET_LAB_TESTS = ["Complete Blood Count (CBC)", "Urinalysis", "Blood Glucose (FBG)", "Malaria RDT / Microscopy", "Lipid Profile", "Renal Function Test (RFT)"];
const DEPARTMENTS = ["Cardiology", "Orthopedics", "Gynecology & Obstetrics", "Pediatrics", "Dermatology", "Ophthalmology", "ENT", "General Surgery"];

export default function TreatmentOrderingModulePage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params?.id as string;

    const [activeTab, setActiveTab] = useState<"PRESCRIPTION" | "LABS" | "RADIOLOGY" | "REFERRAL">("PRESCRIPTION");
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [skippedOrders, setSkippedOrders] = useState<{ testName: string; reason: string }[]>([]);
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

    // --- Orders State ---
    const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
    const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
    const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrder[]>([]);
    const [referral, setReferral] = useState<ReferralOrder>({
        targetDepartment: "",
        priority: "ROUTINE",
        reasonForReferral: "",
    });

    // --- New Item Form Inputs ---
    // Prescription input
    const [newMed, setNewMed] = useState({
        medicationName: "",
        dosage: "500mg",
        route: "Oral",
        frequency: "TID (3x daily)",
        duration: "5 days",
        instructions: "Take after meals",
    });

    // Lab input
    const [newLab, setNewLab] = useState({
        testName: "",
        category: "Hematology",
        urgency: "ROUTINE" as "ROUTINE" | "URGENT" | "STAT",
        clinicalNotes: "",
    });

    // Radiology input
    const [newRad, setNewRad] = useState({
        modality: "X-RAY" as "X-RAY" | "ULTRASOUND" | "CT_SCAN" | "MRI",
        bodySite: "Chest PA View",
        reasonForExam: "",
        urgency: "ROUTINE" as "ROUTINE" | "URGENT" | "STAT",
    });

    // Handlers for adding items
    const handleAddPrescription = () => {
        if (!newMed.medicationName.trim()) return;
        setPrescriptions((prev) => [
            ...prev,
            { id: `rx-${Date.now()}`, ...newMed },
        ]);
        setNewMed({ ...newMed, medicationName: "" });
    };

    const handleAddLabOrder = () => {
        if (!newLab.testName.trim()) return;
        // Prevent adding the same test name twice
        const isDuplicate = labOrders.some(
            (l) => l.testName.trim().toLowerCase() === newLab.testName.trim().toLowerCase()
        );
        if (isDuplicate) {
            setDuplicateWarning(`"${newLab.testName}" is already in this order list.`);
            setTimeout(() => setDuplicateWarning(null), 4000);
            return;
        }
        setDuplicateWarning(null);
        setLabOrders((prev) => [
            ...prev,
            { id: `lab-${Date.now()}`, ...newLab },
        ]);
        setNewLab({ ...newLab, testName: '', clinicalNotes: '' });
    };

    const handleAddRadiologyOrder = () => {
        if (!newRad.bodySite.trim()) return;
        setRadiologyOrders((prev) => [
            ...prev,
            { id: `rad-${Date.now()}`, ...newRad },
        ]);
        setNewRad({ ...newRad, reasonForExam: "" });
    };

    // Submit All Orders to Backend
    const handleFinalizeOrders = async () => {
        if (
            prescriptions.length === 0 &&
            labOrders.length === 0 &&
            radiologyOrders.length === 0 &&
            !referral.targetDepartment
        ) {
            setErrorMsg("Please add at least one prescription, lab order, imaging request, or referral.");
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        const payload = {
            visitId,
            prescriptions,
            labOrders,
            radiologyOrders,
            referral: referral.targetDepartment ? referral : null,
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/consultations/${visitId}/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to submit treatment orders.");
            }

            const data = await res.json();
            // Capture any skipped (duplicate) orders the backend blocked
            setSkippedOrders(data.skipped || []);
            setSubmitted(true);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 6000);
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred while submitting orders.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
            <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/doctor/consultation/${visitId}`)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardList className="w-6 h-6 text-sky-600" />
                                Step 6.4: Clinical Treatment & Order Entry Module
                            </h1>
                            <p className="text-xs text-slate-500">
                                Encounter ID: <span className="font-mono font-bold text-sky-700">{visitId}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleFinalizeOrders}
                        disabled={submitting || submitted}
                        className={`px-5 py-2.5 font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-sm text-white ${
                            submitted
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300'
                        }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Dispatching Orders...
                            </>
                        ) : submitted ? (
                            <>
                                <CheckCircle2 className="w-4 h-4" /> Orders Submitted
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Finalize & Issue Orders
                            </>
                        )}
                    </button>
                </div>

                {/* Banners */}
                {saveSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex flex-col gap-1 font-semibold">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Orders successfully dispatched to Pharmacy, Laboratory, and Radiology systems!</span>
                        </div>
                        {skippedOrders.length > 0 && (
                            <div className="mt-1 pl-6 text-amber-700 font-normal">
                                <span className="font-bold">⚠ {skippedOrders.length} duplicate(s) skipped:</span>{' '}
                                {skippedOrders.map((s) => s.testName).join(', ')} — already ordered today.
                            </div>
                        )}
                    </div>
                )}

                {errorMsg && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 text-xs font-bold gap-2">
                    <button
                        onClick={() => setActiveTab("PRESCRIPTION")}
                        className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${activeTab === "PRESCRIPTION"
                                ? "border-sky-600 text-sky-700 bg-sky-50/50"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        <Pill className="w-4 h-4 text-sky-600" />
                        1. e-Prescriptions ({prescriptions.length})
                    </button>

                    <button
                        onClick={() => setActiveTab("LABS")}
                        className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${activeTab === "LABS"
                                ? "border-sky-600 text-sky-700 bg-sky-50/50"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        <FlaskConical className="w-4 h-4 text-amber-600" />
                        2. Laboratory Orders ({labOrders.length})
                    </button>

                    <button
                        onClick={() => setActiveTab("RADIOLOGY")}
                        className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${activeTab === "RADIOLOGY"
                                ? "border-sky-600 text-sky-700 bg-sky-50/50"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        <FileImage className="w-4 h-4 text-purple-600" />
                        3. Radiology / Imaging ({radiologyOrders.length})
                    </button>

                    <button
                        onClick={() => setActiveTab("REFERRAL")}
                        className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${activeTab === "REFERRAL"
                                ? "border-sky-600 text-sky-700 bg-sky-50/50"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        <UserPlus className="w-4 h-4 text-emerald-600" />
                        4. Specialist Referral
                    </button>
                </div>

                {/* TAB 1: ELECTRONIC PRESCRIPTIONS */}
                {activeTab === "PRESCRIPTION" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 space-y-4 text-xs">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Pill className="w-4 h-4 text-sky-600" /> Add Prescription
                            </h3>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Drug Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Amoxicillin"
                                    value={newMed.medicationName}
                                    onChange={(e) => setNewMed({ ...newMed, medicationName: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                                />
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {PRESET_MEDICATIONS.map((med) => (
                                        <button
                                            key={med}
                                            type="button"
                                            onClick={() => setNewMed({ ...newMed, medicationName: med })}
                                            className="px-2 py-0.5 bg-slate-100 hover:bg-sky-100 text-[10px] text-slate-700 rounded transition"
                                        >
                                            + {med}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Dosage</label>
                                    <input
                                        type="text"
                                        value={newMed.dosage}
                                        onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Route</label>
                                    <select
                                        value={newMed.route}
                                        onChange={(e) => setNewMed({ ...newMed, route: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded bg-white"
                                    >
                                        <option value="Oral">Oral</option>
                                        <option value="IV">Intravenous (IV)</option>
                                        <option value="IM">Intramuscular (IM)</option>
                                        <option value="Topical">Topical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Frequency</label>
                                    <input
                                        type="text"
                                        value={newMed.frequency}
                                        onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Duration</label>
                                    <input
                                        type="text"
                                        value={newMed.duration}
                                        onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Special Instructions</label>
                                <input
                                    type="text"
                                    value={newMed.instructions}
                                    onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded"
                                />
                            </div>

                            <button
                                onClick={handleAddPrescription}
                                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded transition flex items-center justify-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Add to Prescription List
                            </button>
                        </div>

                        {/* List */}
                        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-slate-200 space-y-3">
                            <h3 className="text-xs font-bold text-slate-800">Prescription Order Queue</h3>
                            {prescriptions.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No medications prescribed yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {prescriptions.map((rx) => (
                                        <div key={rx.id} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-slate-800">{rx.medicationName}</span>
                                                <p className="text-slate-600 mt-0.5">
                                                    {rx.dosage} - {rx.route} - {rx.frequency} for {rx.duration}
                                                </p>
                                                <p className="text-[11px] text-slate-400 italic">{rx.instructions}</p>
                                            </div>
                                            <button onClick={() => setPrescriptions(prescriptions.filter((p) => p.id !== rx.id))} className="text-rose-500 hover:text-rose-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: LABORATORY ORDERS */}
                {activeTab === "LABS" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 space-y-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <FlaskConical className="w-4 h-4 text-amber-600" /> Request Lab Test
                            </h3>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Test Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., CBC or Renal Profile"
                                    value={newLab.testName}
                                    onChange={(e) => setNewLab({ ...newLab, testName: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                                />
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {PRESET_LAB_TESTS.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewLab({ ...newLab, testName: t })}
                                            className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 text-[10px] text-slate-700 rounded transition"
                                        >
                                            + {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Urgency Level</label>
                                <select
                                    value={newLab.urgency}
                                    onChange={(e) => setNewLab({ ...newLab, urgency: e.target.value as any })}
                                    className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                                >
                                    <option value="ROUTINE">ROUTINE</option>
                                    <option value="URGENT">URGENT</option>
                                    <option value="STAT">STAT (Emergency Immediate)</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Clinical Indication / Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="Reason for requesting test..."
                                    value={newLab.clinicalNotes}
                                    onChange={(e) => setNewLab({ ...newLab, clinicalNotes: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded"
                                />
                            </div>

                            {duplicateWarning && (
                                <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded flex items-center gap-1.5 font-semibold">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    {duplicateWarning}
                                </div>
                            )}

                            <button
                                onClick={handleAddLabOrder}
                                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded transition flex items-center justify-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Add Lab Request
                            </button>
                        </div>

                        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-slate-200 space-y-3">
                            <h3 className="font-bold text-slate-800">Laboratory Orders Queue</h3>
                            {labOrders.length === 0 ? (
                                <p className="text-slate-400 italic">No lab tests requested yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {labOrders.map((lab) => (
                                        <div key={lab.id} className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">{lab.testName}</span>
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${lab.urgency === "STAT" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-700"
                                                        }`}>
                                                        {lab.urgency}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1">{lab.clinicalNotes}</p>
                                            </div>
                                            <button onClick={() => setLabOrders(labOrders.filter((l) => l.id !== lab.id))} className="text-rose-500 hover:text-rose-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: RADIOLOGY */}
                {activeTab === "RADIOLOGY" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 space-y-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <FileImage className="w-4 h-4 text-purple-600" /> Request Radiology Imaging
                            </h3>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Modality</label>
                                <select
                                    value={newRad.modality}
                                    onChange={(e) => setNewRad({ ...newRad, modality: e.target.value as any })}
                                    className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                                >
                                    <option value="X-RAY">X-RAY</option>
                                    <option value="ULTRASOUND">Ultrasound</option>
                                    <option value="CT_SCAN">CT Scan</option>
                                    <option value="MRI">MRI</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Anatomical Site / View *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Chest PA View, Abdomen Ultrasound"
                                    value={newRad.bodySite}
                                    onChange={(e) => setNewRad({ ...newRad, bodySite: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Reason for Exam</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Rule out pneumonia"
                                    value={newRad.reasonForExam}
                                    onChange={(e) => setNewRad({ ...newRad, reasonForExam: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded"
                                />
                            </div>

                            <button
                                onClick={handleAddRadiologyOrder}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded transition flex items-center justify-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Add Imaging Order
                            </button>
                        </div>

                        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-slate-200 space-y-3">
                            <h3 className="font-bold text-slate-800">Radiology Requisitions</h3>
                            {radiologyOrders.length === 0 ? (
                                <p className="text-slate-400 italic">No imaging requests ordered.</p>
                            ) : (
                                <div className="space-y-2">
                                    {radiologyOrders.map((rad) => (
                                        <div key={rad.id} className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-start">
                                            <div>
                                                <span className="font-mono font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded text-[10px] mr-2">
                                                    {rad.modality}
                                                </span>
                                                <span className="font-bold text-slate-800">{rad.bodySite}</span>
                                                <p className="text-[11px] text-slate-500 mt-1">{rad.reasonForExam}</p>
                                            </div>
                                            <button onClick={() => setRadiologyOrders(radiologyOrders.filter((r) => r.id !== rad.id))} className="text-rose-500 hover:text-rose-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 4: REFERRAL */}
                {activeTab === "REFERRAL" && (
                    <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4 max-w-2xl mx-auto text-xs">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <UserPlus className="w-4 h-4 text-emerald-600" /> Internal Specialty Referral Requisition
                        </h3>

                        <div>
                            <label className="font-bold text-slate-700 block mb-1">Target Specialty Department</label>
                            <select
                                value={referral.targetDepartment}
                                onChange={(e) => setReferral({ ...referral, targetDepartment: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded bg-white font-semibold text-slate-800"
                            >
                                <option value="">-- Select Specialty --</option>
                                {DEPARTMENTS.map((dept) => (
                                    <option key={dept} value={dept}>
                                        {dept}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-700 block mb-1">Referral Priority</label>
                            <select
                                value={referral.priority}
                                onChange={(e) => setReferral({ ...referral, priority: e.target.value as any })}
                                className="w-full p-2.5 border border-slate-300 rounded bg-white font-semibold text-slate-800"
                            >
                                <option value="ROUTINE">ROUTINE (Next available slot)</option>
                                <option value="URGENT">URGENT (Same-day review)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-700 block mb-1">Reason for Referral & Summary</label>
                            <textarea
                                rows={4}
                                placeholder="Detail clinical reason for specialty consultation..."
                                value={referral.reasonForReferral}
                                onChange={(e) => setReferral({ ...referral, reasonForReferral: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                    </div>
                )}

            </div>
        </ProtectedRoute>
    );
}