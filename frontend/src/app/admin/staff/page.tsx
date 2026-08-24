"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { UserPlus, Users, Search, CheckCircle2, XCircle } from "lucide-react";

interface Department {
    id: string;
    name: string;
    code: string;
}

interface Role {
    id: string;
    name: string;
}

interface StaffUser {
    id: string;
    staffId: string;
    fullName: string;
    email: string;
    phone: string | null;
    roleId: string;
    roleName: string;
    departmentId: string | null;
    departmentName: string | null;
    isActive: boolean;
    createdAt: string;
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}`;

export default function StaffManagementPage() {
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Form State
    const [staffId, setStaffId] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [roleId, setRoleId] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchInitialData = async () => {
        try {
            const [staffRes, deptRes, rolesRes] = await Promise.all([
                fetch(`${API_BASE}/api/users`, { credentials: "include" }),
                fetch(`${API_BASE}/api/departments`, { credentials: "include" }),
                fetch(`${API_BASE}/api/users/roles`, { credentials: "include" }),
            ]);

            if (staffRes.ok) {
                const data = await staffRes.json();
                setStaff(data.users || []);
            }
            if (deptRes.ok) {
                const data = await deptRes.json();
                setDepartments(data.departments || []);
            }
            if (rolesRes.ok) {
                const data = await rolesRes.json();
                setRoles(data.roles || []);
            }
        } catch (err) {
            console.error("Failed to load staff management data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleRegisterStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    staffId,
                    fullName,
                    email,
                    phone: phone || undefined,
                    password,
                    roleId,
                    departmentId: departmentId || undefined,
                }),
            });

            if (res.ok) {
                setStaffId("");
                setFullName("");
                setEmail("");
                setPhone("");
                setPassword("");
                setRoleId("");
                setDepartmentId("");
                fetchInitialData();
                alert("Staff user successfully registered!");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create staff account");
            }
        } catch (err) {
            console.error("Error creating staff:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (userId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`${API_BASE}/api/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            if (res.ok) {
                fetchInitialData();
            }
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const filteredStaff = staff.filter((s) =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roleName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <ProtectedRoute allowedRoles={["ADMIN"]}>
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-6 h-6 text-sky-600" />
                            Staff Onboarding & Directory
                        </h1>
                        <p className="text-sm text-slate-500">
                            Register medical and administrative personnel, assign roles, and map to departments.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Registration Form */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-fit">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-sky-600" /> Register New Staff
                        </h2>

                        <form onSubmit={handleRegisterStaff} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Staff ID / Employee Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. ABAY-DOC-001"
                                    value={staffId}
                                    onChange={(e) => setStaffId(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Dr. Abebe Bikila"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="staff@abayhospital.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+251911223344"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Initial Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Role *
                                </label>
                                <select
                                    required
                                    value={roleId}
                                    onChange={(e) => setRoleId(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                                >
                                    <option value="">-- Select Role --</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Assigned Department
                                </label>
                                <select
                                    value={departmentId}
                                    onChange={(e) => setDepartmentId(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500 bg-white"
                                >
                                    <option value="">-- Select Department --</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name} ({dept.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md text-sm transition"
                            >
                                {submitting ? "Registering..." : "Onboard Staff Member"}
                            </button>
                        </form>
                    </div>

                    {/* Directory Table */}
                    <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <div className="relative w-72">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search staff by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                                Total Staff: {filteredStaff.length}
                            </span>
                        </div>

                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                                        <th className="p-3">Staff ID</th>
                                        <th className="p-3">Name & Email</th>
                                        <th className="p-3">Role</th>
                                        <th className="p-3">Department</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-sm">
                                    {filteredStaff.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono font-bold text-slate-700">
                                                {user.staffId}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-semibold text-slate-900">
                                                    {user.fullName}
                                                </div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-sky-100 text-sky-800">
                                                    {user.roleName}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-600 text-xs font-medium">
                                                {user.departmentName || "Unassigned"}
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${user.isActive
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {user.isActive ? (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3" />
                                                    )}
                                                    {user.isActive ? "Active" : "Suspended"}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() =>
                                                        handleToggleActive(user.id, user.isActive)
                                                    }
                                                    className="text-xs font-medium text-slate-600 hover:text-slate-900 border px-2 py-1 rounded hover:bg-slate-100"
                                                >
                                                    {user.isActive ? "Suspend" : "Activate"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}