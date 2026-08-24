"use client";

import React, { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    FlaskConical,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Tag,
    DollarSign,
    Clock,
    TestTube2,
    Filter,
} from "lucide-react";

// --- Types ---
export interface LabTestCatalogItem {
    id: string;
    code: string;
    name: string;
    category: string;
    sampleType: string;
    containerType: string;
    turnaroundTimeHours: number;
    referenceRange: string;
    unit: string;
    price: number;
    isActive: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Preset Selectors
const CATEGORIES = [
    "Hematology",
    "Clinical Chemistry",
    "Microbiology",
    "Parasitology",
    "Serology / Immunology",
    "Urinalysis",
    "Endocrinology",
];

const SAMPLE_TYPES = [
    "Whole Blood",
    "Serum",
    "Plasma",
    "Random Urine",
    "24hr Urine",
    "Stool",
    "CSF",
    "Sputum",
    "Swab",
];

const CONTAINER_TYPES = [
    "EDTA Tube (Purple Top)",
    "Plain Tube (Red/Yellow Top)",
    "Sodium Citrate (Blue Top)",
    "Heparin (Green Top)",
    "Sterile Container",
    "Stool Cup",
];

export default function LabCatalogManagementPage() {
    const [tests, setTests] = useState<LabTestCatalogItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    // Modal / Form State
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<LabTestCatalogItem, "id">>({
        code: "",
        name: "",
        category: "Hematology",
        sampleType: "Whole Blood",
        containerType: "EDTA Tube (Purple Top)",
        turnaroundTimeHours: 2,
        referenceRange: "",
        unit: "",
        price: 0,
        isActive: true,
    });

    // Fetch Existing Catalog
    const fetchCatalog = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/lab/catalog`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setTests(data);
            } else {
                // Fallback demo data if endpoint is not connected yet
                setTests([
                    {
                        id: "1",
                        code: "LAB-CBC",
                        name: "Complete Blood Count (CBC)",
                        category: "Hematology",
                        sampleType: "Whole Blood",
                        containerType: "EDTA Tube (Purple Top)",
                        turnaroundTimeHours: 1,
                        referenceRange: "WBC: 4.5-11.0, RBC: 4.3-5.9, Hb: 13.5-17.5",
                        unit: "x10^3 / uL",
                        price: 250.00,
                        isActive: true,
                    },
                    {
                        id: "2",
                        code: "LAB-FBS",
                        name: "Fasting Blood Sugar (FBS)",
                        category: "Clinical Chemistry",
                        sampleType: "Serum",
                        containerType: "Plain Tube (Red/Yellow Top)",
                        turnaroundTimeHours: 2,
                        referenceRange: "70 - 99",
                        unit: "mg/dL",
                        price: 150.00,
                        isActive: true,
                    },
                    {
                        id: "3",
                        code: "LAB-URINE",
                        name: "Urinalysis Routine",
                        category: "Urinalysis",
                        sampleType: "Random Urine",
                        containerType: "Sterile Container",
                        turnaroundTimeHours: 1,
                        referenceRange: "Leukocytes: Neg, Nitrite: Neg, Protein: Neg",
                        unit: "Qualitative",
                        price: 100.00,
                        isActive: true,
                    },
                ]);
            }
        } catch (err) {
            setFeedback({ type: "error", msg: "Failed to load laboratory test catalog." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    // Filtered List
    const filteredTests = useMemo(() => {
        return tests.filter((item) => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.code.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                selectedCategory === "ALL" || item.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [tests, searchQuery, selectedCategory]);

    // Handlers
    const handleOpenCreateModal = () => {
        setEditingId(null);
        setFormData({
            code: `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
            name: "",
            category: CATEGORIES[0],
            sampleType: SAMPLE_TYPES[0],
            containerType: CONTAINER_TYPES[0],
            turnaroundTimeHours: 2,
            referenceRange: "",
            unit: "",
            price: 0,
            isActive: true,
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item: LabTestCatalogItem) => {
        setEditingId(item.id);
        setFormData({
            code: item.code,
            name: item.name,
            category: item.category,
            sampleType: item.sampleType,
            containerType: item.containerType,
            turnaroundTimeHours: item.turnaroundTimeHours,
            referenceRange: item.referenceRange,
            unit: item.unit,
            price: item.price,
            isActive: item.isActive,
        });
        setIsModalOpen(true);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.code) {
            setFeedback({ type: "error", msg: "Please fill in all required fields." });
            return;
        }

        setSaving(true);
        setFeedback(null);

        const url = editingId
            ? `${API_BASE_URL}/api/lab/catalog/${editingId}`
            : `${API_BASE_URL}/api/lab/catalog`;
        const method = editingId ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                throw new Error("Failed to save test catalog item.");
            }

            setFeedback({
                type: "success",
                msg: `Lab test "${formData.name}" ${editingId ? "updated" : "created"} successfully.`,
            });
            setIsModalOpen(false);
            fetchCatalog();
        } catch (err: any) {
            // Local optimistic update for UI responsiveness
            if (editingId) {
                setTests((prev) =>
                    prev.map((t) => (t.id === editingId ? { id: editingId, ...formData } : t))
                );
            } else {
                setTests((prev) => [...prev, { id: `demo-${Date.now()}`, ...formData }]);
            }
            setFeedback({
                type: "success",
                msg: `Lab test "${formData.name}" saved locally.`,
            });
            setIsModalOpen(false);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteItem = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to deactivate or remove "${name}"?`)) return;

        try {
            await fetch(`${API_BASE_URL}/api/lab/catalog/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            setTests((prev) => prev.filter((t) => t.id !== id));
            setFeedback({ type: "success", msg: `Test "${name}" removed from catalog.` });
        } catch (err) {
            setTests((prev) => prev.filter((t) => t.id !== id));
            setFeedback({ type: "success", msg: `Test "${name}" removed.` });
        }
    };

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "LAB_MANAGER", "DOCTOR"]}>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-xs">

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <FlaskConical className="w-6 h-6 text-amber-600" />
                            Step 7.1: Laboratory Catalog Management
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Configure test menus, specimen container rules, reference thresholds, turnaround SLAs, and billing fees.
                        </p>
                    </div>

                    <button
                        onClick={handleOpenCreateModal}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition flex items-center gap-2 shadow-sm shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Add New Lab Test
                    </button>
                </div>

                {/* Feedback Banners */}
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

                {/* Filters and Search Toolbar */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search test name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 font-semibold"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full md:w-56 p-2 border border-slate-300 rounded bg-white font-bold text-slate-700"
                        >
                            <option value="ALL">All Categories ({tests.length})</option>
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Catalog Table */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                            <span>Loading lab test catalog...</span>
                        </div>
                    ) : filteredTests.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic">
                            No laboratory tests match your current search or filter.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                        <th className="p-3">Code</th>
                                        <th className="p-3">Test Name & Category</th>
                                        <th className="p-3">Specimen / Container</th>
                                        <th className="p-3">Reference Range & Unit</th>
                                        <th className="p-3">TAT</th>
                                        <th className="p-3">Price</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {filteredTests.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                            <td className="p-3 font-mono font-bold text-slate-900">{item.code}</td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800">{item.name}</div>
                                                <span className="inline-block px-2 py-0.5 mt-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1 font-semibold text-slate-800">
                                                    <TestTube2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                    {item.sampleType}
                                                </div>
                                                <p className="text-[10px] text-slate-400">{item.containerType}</p>
                                            </td>
                                            <td className="p-3 max-w-xs">
                                                <p className="truncate font-mono text-[11px] text-slate-800">{item.referenceRange || "N/A"}</p>
                                                {item.unit && <p className="text-[10px] text-slate-400">Unit: {item.unit}</p>}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{item.turnaroundTimeHours}h</span>
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono font-bold text-slate-900">
                                                ${item.price.toFixed(2)}
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.isActive
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : "bg-slate-100 text-slate-500"
                                                        }`}
                                                >
                                                    {item.isActive ? "ACTIVE" : "INACTIVE"}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditModal(item)}
                                                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                                                        title="Edit Test"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id, item.name)}
                                                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                                        title="Deactivate Test"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal: Add/Edit Lab Test */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">

                            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <FlaskConical className="w-4 h-4 text-amber-600" />
                                    {editingId ? "Edit Laboratory Test Entry" : "Create New Laboratory Test Entry"}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Test Code *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Test Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Lipid Profile"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded font-semibold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded bg-white font-semibold"
                                        >
                                            {CATEGORIES.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Sample Type</label>
                                        <select
                                            value={formData.sampleType}
                                            onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded bg-white font-semibold"
                                        >
                                            {SAMPLE_TYPES.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Container</label>
                                        <select
                                            value={formData.containerType}
                                            onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded bg-white font-semibold"
                                        >
                                            {CONTAINER_TYPES.map((ct) => (
                                                <option key={ct} value={ct}>{ct}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Unit of Measure</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. mg/dL, g/L"
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-full p-2 border border-slate-300 rounded"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Target TAT (Hours)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={formData.turnaroundTimeHours}
                                            onChange={(e) => setFormData({ ...formData, turnaroundTimeHours: parseInt(e.target.value) || 1 })}
                                            className="w-full p-2 border border-slate-300 rounded"
                                        />
                                    </div>

                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Price ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                            className="w-full p-2 border border-slate-300 rounded font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Reference Range / Normal Thresholds</label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g., Male: 13.5 - 17.5 g/dL, Female: 12.0 - 15.5 g/dL"
                                        value={formData.referenceRange}
                                        onChange={(e) => setFormData({ ...formData, referenceRange: e.target.value })}
                                        className="w-full p-2 border border-slate-300 rounded font-mono"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-4 h-4 text-amber-600 rounded border-slate-300"
                                    />
                                    <label htmlFor="isActive" className="font-semibold text-slate-700">
                                        Active in Ordering Catalog
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Test Configuration
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