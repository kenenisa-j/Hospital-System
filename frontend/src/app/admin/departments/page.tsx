"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Building2, Plus, Power, Edit3 } from "lucide-react";

interface Department {
    id: string;
    name: string;
    code: string;
    description: string | null;
    isActive: boolean;
}

export default function DepartmentsAdminPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchDepartments = async () => {
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API}/api/departments`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments);
            }
        } catch (err) {
            console.error("Failed to load departments", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API}/api/departments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name, code, description }),
            });

            if (res.ok) {
                setName("");
                setCode("");
                setDescription("");
                fetchDepartments();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create department");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API}/api/departments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            if (res.ok) {
                fetchDepartments();
            }
        } catch (err) {
            console.error("Failed to toggle status", err);
        }
    };

    return (
        <ProtectedRoute allowedRoles={["ADMIN"]}>
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-sky-600" />
                            Department Management
                        </h1>
                        <p className="text-sm text-slate-500">
                            Add, update, or toggle active hospital operational units.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Form */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-fit">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add New Department
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Department Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Pediatrics"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Department Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. PED"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Description
                                </label>

                                <textarea
                                    placeholder="Brief summary of department operations..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                    rows={3}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md text-sm transition"
                            >
                                {submitting ? "Saving..." : "Create Department"}
                            </button>
                        </form>
                    </div>

                    {/* Department List Table */}
                    <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                                    <th className="p-3">Code</th>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-sm">
                                {departments.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-slate-700">
                                            {dept.code}
                                        </td>
                                        <td className="p-3 font-medium text-slate-900">
                                            {dept.name}
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs max-w-xs truncate">
                                            {dept.description || "N/A"}
                                        </td>
                                        <td className="p-3">
                                            <span
                                                className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${dept.isActive
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-slate-100 text-slate-600"
                                                    }`}
                                            >
                                                {dept.isActive ? "Active" : "Disabled"}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => toggleStatus(dept.id, dept.isActive)}
                                                className={`p-1 rounded hover:bg-slate-200 transition ${dept.isActive ? "text-red-600" : "text-emerald-600"
                                                    }`}
                                                title={dept.isActive ? "Disable" : "Enable"}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}