"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    User,
    Phone,
    MapPin,
    Calendar,
    AlertTriangle,
    Stethoscope,
    Pill,
    FlaskConical,
    Receipt,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronRight,
    FileText,
    Loader2,
    HeartPulse,
} from "lucide-react";

// --- Types ---
interface PatientHeader {
    id: string;
    mrn: string;
    fullName: string;
    dateOfBirth: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    phoneNumber: string;
    address: string;
    bloodGroup: string;
    knownAllergies: string | null;
}

interface VisitRecord {
    id: string;
    createdAt: string;
    doctorName: string;
    chiefComplaint: string;
    diagnosis: string;
    vitalSigns: {
        bp?: string;
        pulse?: string;
        temp?: string;
        weight?: string;
    };
}

interface PrescriptionRecord {
    id: string;
    createdAt: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    prescribedBy: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

interface LabTestRecord {
    id: string;
    createdAt: string;
    testName: string;
    category: string;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    resultSummary?: string;
    orderedBy: string;
}

interface BillRecord {
    id: string;
    createdAt: string;
    description: string;
    amount: number;
    paymentStatus: "PAID" | "PENDING" | "OVERDUE";
    invoiceNumber: string;
}

interface MedicalHistoryResponse {
    patient: PatientHeader;
    visits: VisitRecord[];
    prescriptions: PrescriptionRecord[];
    labs: LabTestRecord[];
    bills: BillRecord[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type TabType = "all" | "visits" | "prescriptions" | "labs" | "bills";

export default function PatientMedicalHistoryPage() {
    const params = useParams();
    const patientId = params?.id as string;

    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [data, setData] = useState<MedicalHistoryResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPatientHistory = useCallback(async (signal?: AbortSignal) => {
        if (!patientId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/patients/${patientId}/history`, {
                credentials: "include",
                signal,
            });

            if (!res.ok) {
                throw new Error("Failed to load medical history records.");
            }

            const historyData = await res.json();
            setData(historyData);
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setError(err.message || "An unexpected error occurred while fetching records.");
            }
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        const controller = new AbortController();
        fetchPatientHistory(controller.signal);
        return () => controller.abort();
    }, [fetchPatientHistory]);

    const calculateAge = (dobString: string) => {
        const dob = new Date(dobString);
        const diffMs = Date.now() - dob.getTime();
        const ageDate = new Date(diffMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-3">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Retrieving patient history...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-4xl mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-lg text-center space-y-3">
                <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <h2 className="text-lg font-bold text-rose-900">Record Retrieval Error</h2>
                <p className="text-sm text-rose-700">{error || "Patient not found."}</p>
                <button
                    onClick={() => fetchPatientHistory()}
                    className="mt-2 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded hover:bg-rose-700 transition"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const { patient, visits, prescriptions, labs, bills } = data;

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "LAB_TECH", "RECEPTIONIST"]}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">

                {/* Header Profile Card */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-sky-100 text-sky-700 font-bold text-xl flex items-center justify-center shrink-0">
                                {patient.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold text-slate-800">{patient.fullName}</h1>
                                    <span className="text-xs font-mono font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                                        MRN: {patient.mrn}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                    <span>{calculateAge(patient.dateOfBirth)} Yrs, {patient.gender}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" /> {patient.phoneNumber}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-400" /> {patient.address}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400 block uppercase">Blood Group</span>
                                <span className="text-sm font-bold text-slate-700">{patient.bloodGroup || "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Alert Section */}
                    {patient.knownAllergies && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-xs text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                                <span className="font-bold">Known Allergies/Alerts: </span>
                                {patient.knownAllergies}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Filters */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                    {[
                        { id: "all", label: "Overview Timeline", icon: HeartPulse },
                        { id: "visits", label: `Visits (${visits.length})`, icon: Stethoscope },
                        { id: "prescriptions", label: `Prescriptions (${prescriptions.length})`, icon: Pill },
                        { id: "labs", label: `Lab Tests (${labs.length})`, icon: FlaskConical },
                        { id: "bills", label: `Invoices (${bills.length})`, icon: Receipt },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition whitespace-nowrap ${isActive
                                        ? "bg-sky-600 text-white shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Records Content View */}
                <div className="space-y-4">
                    {/* Clinical Visits */}
                    {(activeTab === "all" || activeTab === "visits") && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-sky-600" /> Consultations & Encounter Notes
                            </h2>
                            {visits.length === 0 ? (
                                <EmptyState label="No visit history recorded." />
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {visits.map((visit) => (
                                        <div key={visit.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                                            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{visit.doctorName}</p>
                                                    <p className="text-xs text-slate-400">{new Date(visit.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                                                    Encounter Note
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                                                <div>
                                                    <span className="font-semibold text-slate-800">Chief Complaint: </span>
                                                    {visit.chiefComplaint}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-800">Diagnosis: </span>
                                                    {visit.diagnosis}
                                                </div>
                                            </div>
                                            {visit.vitalSigns && (
                                                <div className="flex flex-wrap gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">
                                                    {visit.vitalSigns.bp && <span>BP: <b>{visit.vitalSigns.bp}</b></span>}
                                                    {visit.vitalSigns.pulse && <span>Pulse: <b>{visit.vitalSigns.pulse} bpm</b></span>}
                                                    {visit.vitalSigns.temp && <span>Temp: <b>{visit.vitalSigns.temp} °C</b></span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Prescriptions */}
                    {(activeTab === "all" || activeTab === "prescriptions") && (
                        <section className="space-y-3 pt-2">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Pill className="w-4 h-4 text-emerald-600" /> Prescribed Medications
                            </h2>
                            {prescriptions.length === 0 ? (
                                <EmptyState label="No prescriptions issued." />
                            ) : (
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                                            <tr>
                                                <th className="p-3">Medication</th>
                                                <th className="p-3">Dosage / Freq</th>
                                                <th className="p-3">Duration</th>
                                                <th className="p-3">Prescriber</th>
                                                <th className="p-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {prescriptions.map((script) => (
                                                <tr key={script.id} className="hover:bg-slate-50">
                                                    <td className="p-3 font-bold text-slate-800">{script.medicationName}</td>
                                                    <td className="p-3 text-slate-600">{script.dosage} — {script.frequency}</td>
                                                    <td className="p-3 text-slate-600">{script.duration}</td>
                                                    <td className="p-3 text-slate-600">{script.prescribedBy}</td>
                                                    <td className="p-3">
                                                        <span
                                                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${script.status === "ACTIVE"
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : "bg-slate-100 text-slate-600"
                                                                }`}
                                                        >
                                                            {script.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Lab Tests */}
                    {(activeTab === "all" || activeTab === "labs") && (
                        <section className="space-y-3 pt-2">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <FlaskConical className="w-4 h-4 text-purple-600" /> Laboratory Orders & Results
                            </h2>
                            {labs.length === 0 ? (
                                <EmptyState label="No laboratory investigations found." />
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {labs.map((lab) => (
                                        <div key={lab.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{lab.testName}</p>
                                                    <p className="text-xs text-slate-400">{lab.category} • Ordered by {lab.orderedBy}</p>
                                                </div>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${lab.status === "COMPLETED"
                                                            ? "bg-purple-100 text-purple-800"
                                                            : "bg-amber-100 text-amber-800"
                                                        }`}
                                                >
                                                    {lab.status}
                                                </span>
                                            </div>
                                            {lab.resultSummary && (
                                                <div className="p-2 bg-slate-50 border border-slate-100 rounded text-xs text-slate-700">
                                                    <span className="font-bold">Result Summary: </span>
                                                    {lab.resultSummary}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Invoices */}
                    {(activeTab === "all" || activeTab === "bills") && (
                        <section className="space-y-3 pt-2">
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-amber-600" /> Billing & Payment Ledger
                            </h2>
                            {bills.length === 0 ? (
                                <EmptyState label="No billing records found." />
                            ) : (
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                                            <tr>
                                                <th className="p-3">Invoice #</th>
                                                <th className="p-3">Description</th>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Amount</th>
                                                <th className="p-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bills.map((bill) => (
                                                <tr key={bill.id} className="hover:bg-slate-50">
                                                    <td className="p-3 font-mono font-bold text-slate-700">{bill.invoiceNumber}</td>
                                                    <td className="p-3 text-slate-600">{bill.description}</td>
                                                    <td className="p-3 text-slate-400">{new Date(bill.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-3 font-bold text-slate-800">${bill.amount.toFixed(2)}</td>
                                                    <td className="p-3">
                                                        <span
                                                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${bill.paymentStatus === "PAID"
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : "bg-rose-100 text-rose-800"
                                                                }`}
                                                        >
                                                            {bill.paymentStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="p-4 border border-dashed border-slate-200 bg-slate-50/50 rounded-lg text-center text-xs text-slate-400">
            {label}
        </div>
    );
}