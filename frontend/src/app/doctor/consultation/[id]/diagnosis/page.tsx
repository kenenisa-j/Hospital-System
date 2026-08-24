"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    Stethoscope,
    Search,
    Plus,
    Trash2,
    Save,
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    Loader2,
    FileCheck2,
    Tag,
    ShieldAlert,
    Info,
} from "lucide-react";

// --- Types ---
interface ICD10Code {
    code: string;
    description: string;
    category: string;
}

interface DiagnosisItem {
    id: string;
    icdCode: string;
    description: string;
    type: "PRIMARY" | "SECONDARY" | "DIFFERENTIAL";
    certainty: "PROVISIONAL" | "CONFIRMED";
    notes?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Common ICD-10 clinical dataset preset for quick-selection & offline search fallback
const MOCK_ICD10_DATABASE: ICD10Code[] = [
    { code: "A09", description: "Infectious gastroenteritis and colitis, unspecified", category: "Gastrointestinal" },
    { code: "B50.9", description: "Plasmodium falciparum malaria, unspecified", category: "Infectious" },
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Endocrine" },
    { code: "I10", description: "Essential (primary) hypertension", category: "Cardiovascular" },
    { code: "J06.9", description: "Acute upper respiratory infection, unspecified", category: "Respiratory" },
    { code: "J18.9", description: "Pneumonia, unspecified organism", category: "Respiratory" },
    { code: "J45.909", description: "Unspecified asthma, uncomplicated", category: "Respiratory" },
    { code: "K29.70", description: "Gastritis, unspecified, without bleeding", category: "Gastrointestinal" },
    { code: "N39.0", description: "Urinary tract infection, site not specified", category: "Urology" },
    { code: "R50.9", description: "Fever, unspecified", category: "General Symptoms" },
    { code: "R51.9", description: "Headache, unspecified", category: "Neurology" },
];

export default function DiagnosisModulePage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params?.id as string;

    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<ICD10Code[]>([]);
    const [searching, setSearching] = useState<boolean>(false);

    // Active Diagnoses Form State
    const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);

    // Custom/Free-text diagnosis modal state
    const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
    const [customCode, setCustomCode] = useState<string>("");
    const [customDescription, setCustomDescription] = useState<string>("");

    // Fetch Existing Consultation Diagnoses
    const fetchDiagnosisContext = useCallback(async () => {
        if (!visitId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/consultations/${visitId}/diagnoses`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                if (data.diagnoses && data.diagnoses.length > 0) {
                    setDiagnoses(data.diagnoses);
                }
            }
        } catch (err: any) {
            console.warn("Could not load pre-existing diagnoses, starting fresh.", err);
        } finally {
            setLoading(false);
        }
    }, [visitId]);

    useEffect(() => {
        fetchDiagnosisContext();
    }, [fetchDiagnosisContext]);

    // Handle ICD-10 Search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        const timer = setTimeout(() => {
            const filtered = MOCK_ICD10_DATABASE.filter(
                (item) =>
                    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(filtered);
            setSearching(false);
        }, 200);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Add ICD Code to Diagnoses List
    const handleSelectICD = (icd: ICD10Code) => {
        if (diagnoses.some((d) => d.icdCode === icd.code)) {
            setErrorMsg(`ICD Code ${icd.code} is already added to this encounter.`);
            return;
        }

        const isFirst = diagnoses.length === 0;
        const newItem: DiagnosisItem = {
            id: `diag-${Date.now()}`,
            icdCode: icd.code,
            description: icd.description,
            type: isFirst ? "PRIMARY" : "SECONDARY",
            certainty: "PROVISIONAL",
            notes: "",
        };

        setDiagnoses([...diagnoses, newItem]);
        setSearchQuery("");
        setSearchResults([]);
        setErrorMsg(null);
    };

    // Add Custom Diagnosis
    const handleAddCustomDiagnosis = () => {
        if (!customDescription.trim()) {
            setErrorMsg("Diagnosis description is required.");
            return;
        }

        const isFirst = diagnoses.length === 0;
        const newItem: DiagnosisItem = {
            id: `diag-custom-${Date.now()}`,
            icdCode: customCode.trim().toUpperCase() || "UNSPECIFIED",
            description: customDescription.trim(),
            type: isFirst ? "PRIMARY" : "SECONDARY",
            certainty: "PROVISIONAL",
            notes: "",
        };

        setDiagnoses([...diagnoses, newItem]);
        setCustomCode("");
        setCustomDescription("");
        setShowCustomInput(false);
        setErrorMsg(null);
    };

    // Update Diagnosis Attribute
    const handleUpdateDiagnosis = (id: string, field: keyof DiagnosisItem, value: any) => {
        setDiagnoses((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    // If changing to PRIMARY, demote any other PRIMARY to SECONDARY
                    if (field === "type" && value === "PRIMARY") {
                        return { ...item, type: "PRIMARY" };
                    }
                    return { ...item, [field]: value };
                } else if (field === "type" && value === "PRIMARY") {
                    return { ...item, type: "SECONDARY" };
                }
                return item;
            })
        );
    };

    // Remove Diagnosis Item
    const handleRemoveDiagnosis = (id: string) => {
        setDiagnoses((prev) => prev.filter((item) => item.id !== id));
    };

    // Save Diagnoses to Backend
    const handleSaveDiagnoses = async () => {
        if (diagnoses.length === 0) {
            setErrorMsg("Please record at least one diagnosis before saving.");
            return;
        }

        const hasPrimary = diagnoses.some((d) => d.type === "PRIMARY");
        if (!hasPrimary) {
            setErrorMsg("A Primary Diagnosis must be explicitly assigned.");
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/consultations/${visitId}/diagnoses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ visitId, diagnoses }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to persist clinical diagnoses.");
            }

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred while saving diagnosis record.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-500">Loading Clinical Diagnosis Engine...</p>
            </div>
        );
    }

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
            <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">

                {/* Navigation & Header */}
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
                                <Tag className="w-6 h-6 text-sky-600" />
                                Step 6.3: Diagnosis Coding & Categorization
                            </h1>
                            <p className="text-xs text-slate-500">
                                Encounter ID: <span className="font-mono font-bold text-sky-700">{visitId}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveDiagnoses}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-sm"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Saving Codes...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Finalize Diagnoses
                            </>
                        )}
                    </button>
                </div>

                {/* Notifications */}
                {saveSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Clinical diagnoses successfully recorded for this consultation!</span>
                    </div>
                )}

                {errorMsg && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT: ICD-10 Code Search & Quick Selection (5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Search className="w-4 h-4 text-sky-600" />
                                ICD-10 Code Search
                            </h2>

                            {/* Search Bar */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type code or term (e.g., J06.9, Malaria, Hypertension)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            </div>

                            {/* Search Results Dropdown / Panel */}
                            {searchQuery.trim().length > 0 && (
                                <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                                    {searching ? (
                                        <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" /> Searching ICD Database...
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((item) => (
                                            <button
                                                key={item.code}
                                                onClick={() => handleSelectICD(item)}
                                                className="w-full p-2.5 text-left hover:bg-sky-50 transition flex items-center justify-between group text-xs"
                                            >
                                                <div>
                                                    <span className="font-mono font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded text-[10px]">
                                                        {item.code}
                                                    </span>
                                                    <p className="font-medium text-slate-800 mt-0.5 line-clamp-1">{item.description}</p>
                                                </div>
                                                <Plus className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-slate-500">
                                            No matching ICD-10 code found for &quot;{searchQuery}&quot;.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Fallback Custom Entry Trigger */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-500">Code missing from list?</span>
                                <button
                                    onClick={() => setShowCustomInput(!showCustomInput)}
                                    className="text-xs font-bold text-sky-600 hover:text-sky-800 transition flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Custom Diagnosis
                                </button>
                            </div>

                            {/* Custom Diagnosis Inline Form */}
                            {showCustomInput && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Code (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. R50.9 or Custom"
                                            value={customCode}
                                            onChange={(e) => setCustomCode(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Description *</label>
                                        <input
                                            type="text"
                                            placeholder="Clinical diagnosis description..."
                                            value={customDescription}
                                            onChange={(e) => setCustomDescription(e.target.value)}
                                            className="w-full p-2 border border-slate-300 rounded font-medium"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddCustomDiagnosis}
                                        className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded transition"
                                    >
                                        Confirm Custom Diagnosis
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Selected Diagnoses List & Categorization (7 Cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                                    Active Clinical Diagnoses ({diagnoses.length})
                                </h2>
                                <span className="text-[11px] text-slate-500">Assign Primary, Certainty & Clinical Notes</span>
                            </div>

                            {diagnoses.length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg space-y-2">
                                    <Info className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p className="text-xs font-semibold text-slate-500">No diagnoses assigned yet.</p>
                                    <p className="text-[11px] text-slate-400">
                                        Use the search panel on the left to add standard ICD-10 diagnostic codes.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {diagnoses.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`p-4 rounded-lg border transition ${item.type === "PRIMARY"
                                                    ? "bg-sky-50/60 border-sky-300"
                                                    : "bg-slate-50 border-slate-200"
                                                }`}
                                        >
                                            {/* Top Row: Code + Description + Delete */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-start gap-2">
                                                    <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                                                        {item.icdCode}
                                                    </span>
                                                    <div>
                                                        <h3 className="text-xs font-bold text-slate-800">{item.description}</h3>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleRemoveDiagnosis(item.id)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 transition rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Controls Row: Category Type + Certainty */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">

                                                {/* Diagnosis Classification */}
                                                <div>
                                                    <label className="font-semibold text-slate-600 block mb-1">Diagnosis Role</label>
                                                    <select
                                                        value={item.type}
                                                        onChange={(e) => handleUpdateDiagnosis(item.id, "type", e.target.value)}
                                                        className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-800"
                                                    >
                                                        <option value="PRIMARY">PRIMARY (Main Cause)</option>
                                                        <option value="SECONDARY">SECONDARY / Comorbidity</option>
                                                        <option value="DIFFERENTIAL">DIFFERENTIAL (Under Investigation)</option>
                                                    </select>
                                                </div>

                                                {/* Certainty Status */}
                                                <div>
                                                    <label className="font-semibold text-slate-600 block mb-1">Diagnostic Certainty</label>
                                                    <select
                                                        value={item.certainty}
                                                        onChange={(e) => handleUpdateDiagnosis(item.id, "certainty", e.target.value)}
                                                        className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-800"
                                                    >
                                                        <option value="PROVISIONAL">PROVISIONAL (Presumptive)</option>
                                                        <option value="CONFIRMED">CONFIRMED (Lab/Definitive)</option>
                                                    </select>
                                                </div>

                                            </div>

                                            {/* Optional Specific Clinical Notes */}
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Optional clinical notes or specific sub-typing..."
                                                    value={item.notes || ""}
                                                    onChange={(e) => handleUpdateDiagnosis(item.id, "notes", e.target.value)}
                                                    className="w-full p-2 text-xs border border-slate-200 rounded bg-white text-slate-700"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </ProtectedRoute>
    );
}