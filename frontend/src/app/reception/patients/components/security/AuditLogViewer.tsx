"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Search, Filter, Clock, Loader2, Lock, AlertCircle, RefreshCw } from "lucide-react";

interface AuditEntry {
    id: string;
    userName: string | null;
    userRole: string;
    action: string;
    entityType: string;
    entityId: string;
    ipAddress: string | null;
    createdAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/audit?limit=100`, {
                credentials: "include",
            });
            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (err: any) {
            console.error("Failed to fetch audit logs:", err);
            setError(err.message || "Failed to load audit logs.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = logs.filter(
        (log) =>
            (log.userName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entityType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" /> Immutable Security Audit Logs
                    </h1>
                    <p className="text-xs text-slate-500">Track system events, data mutations, and access records in real time.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold">
                        <Lock className="w-4 h-4" /> System Hardened & Encrypted
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                        type="text"
                        placeholder="Search by user, action, or record ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <span className="text-xs text-slate-400 font-semibold">{filteredLogs.length} entries found</span>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-sm font-semibold">Loading audit logs...</span>
                    </div>
                ) : error ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                        <p className="text-sm font-semibold text-slate-600">Failed to Load Audit Logs</p>
                        <p className="text-xs">{error}</p>
                        <button onClick={fetchLogs} className="mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition">Retry</button>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <ShieldCheck className="w-10 h-10 text-slate-200" />
                        <p className="text-sm font-semibold">No audit events recorded yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                    <th className="py-3 px-4">Timestamp</th>
                                    <th className="py-3 px-4">User</th>
                                    <th className="py-3 px-4">Action</th>
                                    <th className="py-3 px-4">Target Record</th>
                                    <th className="py-3 px-4">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition">
                                        <td className="py-3 px-4 text-slate-500 font-mono">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(log.createdAt).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-slate-800 block">{log.userName || "System"}</span>
                                            <span className="text-[10px] font-semibold text-slate-400">{log.userRole}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-bold text-[10px]">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-slate-700 block">{log.entityType}</span>
                                            <span className="text-[10px] font-mono text-slate-400">{log.entityId}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 font-mono">{log.ipAddress || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}