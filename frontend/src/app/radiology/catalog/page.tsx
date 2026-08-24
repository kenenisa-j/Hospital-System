"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    Scan,
    Plus,
    Search,
    Filter,
    Edit3,
    Trash2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    Radiation,
    FileText,
    DollarSign,
    Clock,
} from "lucide-react";

// --- Types ---
export type ModalityType = "X_RAY" | "ULTRASOUND" | "CT_SCAN" | "MRI" | "MAMMOGRAPHY" | "FLUOROSCOPY";

export interface RadiologyExam {
    id: string;
    code: string; // e.g., RAD-XRAY-001
    name: string;
    modality: ModalityType;
    bodyPart: string;
    requiresContrast: boolean;
    preparationInstructions: string;
    estimatedDurationMinutes: number;
    radiationExposed: boolean;
    basePrice: number;
    isActive: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RadiologyExamCatalogPage() {
    const [exams, setExams] = useState<RadiologyExam[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedModality, setSelectedModality] = useState<string>("ALL");
    const [showModal, setShowModal] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    // Form State
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<RadiologyExam, "id">>({
        code: "",
        name: "",
        modality: "X_RAY",
        bodyPart: "CHEST",
        requiresContrast: false,
        preparationInstructions: "",
        estimatedDurationMinutes: 15,
        radiationExposed: true,
        basePrice: 0,
        isActive: true,
    });

    // Fetch Radiology Catalog
    const fetchExams = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/radiology/catalog`, {
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();
                setExams(data);
            } else {
                // Fallback Mock Data for Development
                const mockExams: RadiologyExam[] = [
                    {
                        id: "rad-101",
                        code: "RAD-XRAY-01",
                        name: "Chest PA/Lateral View",
                        modality: "X_RAY",
                        bodyPart: "Chest",
                        requiresContrast: false,
                        preparationInstructions: "Remove all metal objects and jewelry above the waist.",
                        estimatedDurationMinutes: 10,
                        radiationExposed: true,
                        basePrice: 350.0,
                        isActive: true,
                    },
                    {
                        id: "rad-102",
                        code: "RAD-US-02",
                        name: "Abdominal & Pelvic Ultrasound",
                        modality: "ULTRASOUND",
                        bodyPart: "Abdomen/Pelvis",
                        requiresContrast: false,
                        preparationInstructions: "NPO for 6 hours prior to scan; drink 1L of water 1 hour prior for full bladder.",
                        estimatedDurationMinutes: 30,
                        radiationExposed: false,
                        basePrice: 600.0,
                        isActive: true,
                    },
                    {
                        id: "rad-103",
                        code: "RAD-CT-03",
                        name: "Brain CT Scan (With Contrast)",
                        modality: "CT_SCAN",
                        bodyPart: "Head / Brain",
                        requiresContrast: true,
                        preparationInstructions: "NPO for 4 hours; verify serum creatinine / renal function test before procedure.",
                        estimatedDurationMinutes: 25,
                        radiationExposed: true,
                        basePrice: 2400.0,
                        isActive: true,
                    },
                    {
                        id: "rad-104",
                        code: "RAD-MRI-04",
                        name: "Lumbar Spine MRI",
                        modality: "MRI",
                        bodyPart: "Spine",
                        requiresContrast: false,
                        preparationInstructions: "Complete MRI screening safety checklist (check for implants, pacemakers, metal fragments).",
                        estimatedDurationMinutes: 45,
                        radiationExposed: false,
                        basePrice: 4500.0,
                        isActive: true,
                    },
                ];
                setExams(mockExams);
            }
        } catch (err) {
            setFeedback({ type: "error", msg: "Failed to load radiology catalog." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const openCreateModal = () => {
        setEditingExamId(null);
        setFormData({
            code: `RAD-${Date.now().toString().slice(-4)}`,
            name: "",
            modality: "X_RAY",
            bodyPart: "Chest",
            requiresContrast: false,
            preparationInstructions: "",
            estimatedDurationMinutes: 15,
            radiationExposed: true,
            basePrice: 0,
            isActive: true,
        });
        setShowModal(true);
    };

    const openEditModal = (exam: RadiologyExam) => {
        setEditingExamId(exam.id);
        setFormData({
            code: exam.code,
            name: exam.name,
            modality: exam.modality,
            bodyPart: exam.bodyPart,
            requiresContrast: exam.requiresContrast,
            preparationInstructions: exam.preparationInstructions,
            estimatedDurationMinutes: exam.estimatedDurationMinutes,
            radiationExposed: exam.radiationExposed,
            basePrice: exam.basePrice,
            isActive: exam.isActive,
        });
        setShowModal(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        const url = editingExamId
            ? `${API_BASE_URL}/api/radiology/catalog/${editingExamId}`
            : `${API_BASE_URL}/api/radiology/catalog`;
        const method = editingExamId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Failed to save exam item.");

            setFeedback({
                type: "success",
                msg: `Radiology exam successfully ${editingExamId ? "updated" : "added to catalog"}.`,
            });
            setShowModal(false);
            fetchExams();
        } catch (err) {
            // Local Fallback Update for UI Demo
            if (editingExamId) {
                setExams((prev) =>
                    prev.map((item) => (item.id === editingExamId ? { ...item, ...formData } : item))
                );
            } else {
                setExams((prev) => [...prev, { id: `rad-${Date.now()}`, ...formData }]);
            }
            setFeedback({
                type: "success",
                msg: `Exam successfully saved locally!`,
            });
            setShowModal(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Filters
    const filteredExams = exams.filter((exam) => {
        const matchesSearch =
            exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.bodyPart.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesModality = selectedModality === "ALL" || exam.modality === selectedModality;

        return matchesSearch && matchesModality;
    });

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "RADIOLOGIST", "RADIOLOGY_TECH", "RECEPTIONIST"]}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-xs">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Scan className="w-6 h-6 text-indigo-600" />
                            Step 8.1: Radiology Exam Catalog
                        </h1>
                        <p className="text-slate-500 mt-0.5">
                            Configure imaging modalities, body target specs, contrast pre-reqs, radiation warnings, and pricing schedules.
                        </p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center gap-2 shadow-sm shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Add Imaging Exam
                    </button>
                </div>

                {/* Feedback Banner */}
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

                {/* Filters & Search Bar */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search exam name, code, or body part..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={selectedModality}
                            onChange={(e) => setSelectedModality(e.target.value)}
                            className="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700 text-xs"
                        >
                            <option value="ALL">All Modalities</option>
                            <option value="X_RAY">X-Ray</option>
                            <option value="ULTRASOUND">Ultrasound</option>
                            <option value="CT_SCAN">CT Scan</option>
                            <option value="MRI">MRI</option>
                            <option value="MAMMOGRAPHY">Mammography</option>
                            <option value="FLUOROSCOPY">Fluoroscopy</option>
                        </select>
                    </div>
                </div>

                {/* Catalog Table */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <span>Loading Radiology Catalog...</span>
                        </div>
                    ) : filteredExams.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-semibold">
                            No radiology exams found matching the criteria.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                        <th className="p-3">Code</th>
                                        <th className="p-3">Exam Name</th>
                                        <th className="p-3">Modality</th>
                                        <th className="p-3">Target Region</th>
                                        <th className="p-3 text-center">Safety Parameters</th>
                                        <th className="p-3">Est. Time</th>
                                        <th className="p-3 text-right">Base Price (ETB)</th>
                                        <th className="p-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {filteredExams.map((exam) => (
                                        <tr key={exam.id} className="hover:bg-slate-50/80 transition">
                                            <td className="p-3 font-mono font-bold text-slate-800">{exam.code}</td>
                                            <td className="p-3 font-bold text-slate-900">{exam.name}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${exam.modality === "X_RAY"
                                                            ? "bg-slate-100 text-slate-800"
                                                            : exam.modality === "ULTRASOUND"
                                                                ? "bg-sky-100 text-sky-800"
                                                                : exam.modality === "CT_SCAN"
                                                                    ? "bg-amber-100 text-amber-800"
                                                                    : "bg-purple-100 text-purple-800"
                                                        }`}
                                                >
                                                    {exam.modality.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-600">{exam.bodyPart}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {exam.radiationExposed && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                            <Radiation className="w-3 h-3 text-amber-600" /> Radiation
                                                        </span>
                                                    )}
                                                    {exam.requiresContrast && (
                                                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                                            + Contrast
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono text-slate-600">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-slate-400" /> {exam.estimatedDurationMinutes}m
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-emerald-700">
                                                {exam.basePrice.toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => openEditModal(exam)}
                                                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
                                                    title="Edit Exam Spec"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg border border-slate-200 max-w-xl w-full p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                                <h3 className="font-bold text-slate-800 text-base">
                                    {editingExamId ? "Edit Radiology Exam Specifications" : "Register New Radiology Exam"}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Exam Code *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Imaging Modality *</label>
                                        <select
                                            value={formData.modality}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    modality: e.target.value as ModalityType,
                                                    radiationExposed: e.target.value === "X_RAY" || e.target.value === "CT_SCAN",
                                                })
                                            }
                                            className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-700"
                                        >
                                            <option value="X_RAY">X-Ray</option>
                                            <option value="ULTRASOUND">Ultrasound</option>
                                            <option value="CT_SCAN">CT Scan</option>
                                            <option value="MRI">MRI</option>
                                            <option value="MAMMOGRAPHY">Mammography</option>
                                            <option value="FLUOROSCOPY">Fluoroscopy</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Exam Description / Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Abdominal & Pelvic CT Scan with IV Contrast"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded font-semibold"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Body Target *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Brain, Chest"
                                            value={formData.bodyPart}
                                            onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Est. Duration (Min)</label>
                                        <input
                                            type="number"
                                            required
                                            min={5}
                                            value={formData.estimatedDurationMinutes}
                                            onChange={(e) =>
                                                setFormData({ ...formData, estimatedDurationMinutes: parseInt(e.target.value) || 15 })
                                            }
                                            className="w-full p-2 border border-slate-300 rounded font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Base Price (ETB) *</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={formData.basePrice}
                                            onChange={(e) =>
                                                setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })
                                            }
                                            className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">
                                        Patient Preparation Instructions
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Fast for 6 hours; complete renal profile test prior to contrast..."
                                        value={formData.preparationInstructions}
                                        onChange={(e) => setFormData({ ...formData, preparationInstructions: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded"
                                    />
                                </div>

                                <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={formData.requiresContrast}
                                            onChange={(e) => setFormData({ ...formData, requiresContrast: e.target.checked })}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Requires Contrast Agent
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-800">
                                        <input
                                            type="checkbox"
                                            checked={formData.radiationExposed}
                                            onChange={(e) => setFormData({ ...formData, radiationExposed: e.target.checked })}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        Involves Ionizing Radiation
                                    </label>
                                </div>

                                <div className="flex justify-end gap-2 border-t pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center gap-2"
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Save Exam Catalog Item
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </ProtectedRoute>
    );
}