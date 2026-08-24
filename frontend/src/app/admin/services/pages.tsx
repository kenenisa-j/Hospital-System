"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Tag, Plus, Search, DollarSign, Stethoscope, FlaskConical, Scan, Activity } from "lucide-react";

interface ServiceItem {
    id: string;
    code: string;
    name: string;
    category: "CONSULTATION" | "LABORATORY" | "RADIOLOGY" | "PROCEDURE" | "PHARMACY" | "NURSING_CARE" | "ACCOMMODATION" | "OTHER";
    unitPrice: string;
    description: string | null;
    isActive: boolean;
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}`;

export default function ServiceCatalogPage() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

    // New Service Form State
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState<ServiceItem["category"]>("CONSULTATION");
    const [unitPrice, setUnitPrice] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchServices = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/services`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setServices(data.services || []);
            }
        } catch (err) {
            console.error("Failed to load service catalog", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/services`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    code,
                    name,
                    category,
                    unitPrice: parseFloat(unitPrice),
                    description: description || undefined,
                }),
            });

            if (res.ok) {
                setCode("");
                setName("");
                setUnitPrice("");
                setDescription("");
                fetchServices();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create service entry");
            }
        } catch (err) {
            console.error("Error creating service:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredServices = services.filter((s) => {
        const matchesSearch =
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "ALL" || s.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryBadge = (cat: ServiceItem["category"]) => {
        switch (cat) {
            case "CONSULTATION":
                return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800"><Stethoscope className="w-3 h-3" /> Consultation</span>;
            case "LABORATORY":
                return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800"><FlaskConical className="w-3 h-3" /> Laboratory</span>;
            case "RADIOLOGY":
                return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800"><Scan className="w-3 h-3" /> Radiology</span>;
            case "PROCEDURE":
                return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800"><Activity className="w-3 h-3" /> Procedure</span>;
            default:
                return <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">{cat}</span>;
        }
    };

    return (
        <ProtectedRoute allowedRoles={["ADMIN"]}>
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Tag className="w-6 h-6 text-sky-600" />
                            Service & Pricing Catalog
                        </h1>
                        <p className="text-sm text-slate-500">
                            Set standard pricing for medical consultations, lab investigations, imaging scans, and procedures.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Service Registration Form */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-fit">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-sky-600" /> Add Catalog Item
                        </h2>

                        <form onSubmit={handleCreateService} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Service Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. SRV-CONS-GP"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Service Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. General OPD Consultation"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as any)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                                >
                                    <option value="CONSULTATION">Consultation</option>
                                    <option value="LABORATORY">Laboratory</option>
                                    <option value="RADIOLOGY">Radiology</option>
                                    <option value="PROCEDURE">Procedure</option>
                                    <option value="PHARMACY">Pharmacy</option>
                                    <option value="NURSING_CARE">Nursing Care</option>
                                    <option value="ACCOMMODATION">Accommodation</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Standard Price (ETB)
                                </label>
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-bold">
                                        ETB
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="250.00"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(e.target.value)}
                                        className="w-full pl-12 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Description
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Optional billing details or notes..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md text-sm transition"
                            >
                                {submitting ? "Saving..." : "Add to Price Catalog"}
                            </button>
                        </form>
                    </div>

                    {/* Directory Table */}
                    <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-center">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search code or service name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full sm:w-auto px-3 py-1.5 text-sm border rounded-md bg-white focus:ring-2 focus:ring-sky-500"
                            >
                                <option value="ALL">All Categories</option>
                                <option value="CONSULTATION">Consultations</option>
                                <option value="LABORATORY">Laboratory</option>
                                <option value="RADIOLOGY">Radiology</option>
                                <option value="PROCEDURE">Procedures</option>
                                <option value="PHARMACY">Pharmacy</option>
                                <option value="NURSING_CARE">Nursing Care</option>
                                <option value="ACCOMMODATION">Accommodation</option>
                            </select>
                        </div>

                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                                        <th className="p-3">Code</th>
                                        <th className="p-3">Service Name</th>
                                        <th className="p-3">Category</th>
                                        <th className="p-3 text-right">Standard Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-sm">
                                    {filteredServices.map((service) => (
                                        <tr key={service.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono font-bold text-slate-700">
                                                {service.code}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-semibold text-slate-900">{service.name}</div>
                                                {service.description && (
                                                    <div className="text-xs text-slate-500">{service.description}</div>
                                                )}
                                            </td>
                                            <td className="p-3">{getCategoryBadge(service.category)}</td>
                                            <td className="p-3 text-right font-mono font-bold text-emerald-700">
                                                {parseFloat(service.unitPrice).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                })}{" "}
                                                ETB
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredServices.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-slate-400 text-sm">
                                                No service catalog entries found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}