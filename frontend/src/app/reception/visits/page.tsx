'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, Clock, CheckCircle2, XCircle, Search, Eye, PlusCircle, CreditCard, Filter, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Visit {
    id: string;
    ticketNumber: string;
    patientName: string;
    patientMrn: string;
    visitDate: string;
    department: string;
    doctor: string;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL' | 'WAIVED';
}

const STATUS_STYLES: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    PARTIAL: 'bg-blue-100 text-blue-700 border-blue-200',
    WAIVED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function VisitsPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('ALL');

    const fetchVisits = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/visits`, { credentials: 'include' });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            const data = await res.json();
            setVisits(data.visits || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load visits.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVisits(); }, [fetchVisits]);

    const filtered = visits.filter((v) => {
        const matchSearch =
            v.patientName.toLowerCase().includes(search.toLowerCase()) ||
            v.patientMrn.toLowerCase().includes(search.toLowerCase()) ||
            v.ticketNumber.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'ALL' || v.paymentStatus === filter;
        return matchSearch && matchFilter;
    });

    const totalCollected = visits.filter(v => v.paymentStatus === 'PAID').reduce((s, v) => s + v.paidAmount, 0);
    const totalPending = visits.filter(v => v.paymentStatus === 'PENDING').reduce((s, v) => s + v.totalAmount, 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-teal-600" />
                        Visits &amp; Billing Register
                    </h1>
                    <p className="text-sm text-slate-500">All patient visits, charge slips, and payment statuses.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchVisits}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <Link
                        href="/reception/visits/new"
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
                    >
                        <PlusCircle className="w-4 h-4" /> New Visit
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Total Visits</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{visits.length}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 shadow-sm">
                    <p className="text-xs text-emerald-700 font-semibold uppercase">Collected Today</p>
                    <p className="text-3xl font-bold text-emerald-900 mt-1">ETB {totalCollected.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
                    <p className="text-xs text-amber-700 font-semibold uppercase">Pending Payment</p>
                    <p className="text-3xl font-bold text-amber-900 mt-1">ETB {totalPending.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Paid Visits</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{visits.filter(v => v.paymentStatus === 'PAID').length}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50/50">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search patient, MRN, or visit #..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="WAIVED">Waived</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading visits...</span>
                    </div>
                ) : error ? (
                    <div className="py-12 text-center text-sm text-rose-600">
                        <p className="font-semibold">Failed to load visits</p>
                        <p className="text-xs text-slate-400 mt-1">{error}</p>
                        <button onClick={fetchVisits} className="mt-3 text-xs text-teal-600 hover:underline">Try again</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Visit #</th>
                                    <th className="px-4 py-3">Patient</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Department</th>
                                    <th className="px-4 py-3">Doctor</th>
                                    <th className="px-4 py-3 text-right">Amount (ETB)</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((v) => (
                                    <tr key={v.id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3 font-mono font-bold text-teal-700">{v.ticketNumber}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800">{v.patientName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{v.patientMrn}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{v.visitDate}</td>
                                        <td className="px-4 py-3 text-slate-700">{v.department}</td>
                                        <td className="px-4 py-3 text-slate-600">{v.doctor}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-bold text-slate-900">{v.totalAmount.toLocaleString()}</div>
                                            {v.paymentStatus === 'PARTIAL' && (
                                                <div className="text-xs text-slate-400">Paid: {v.paidAmount.toLocaleString()}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border ${STATUS_STYLES[v.paymentStatus]}`}>
                                                {v.paymentStatus === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                                                {v.paymentStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                                                {v.paymentStatus === 'PARTIAL' && <CreditCard className="w-3 h-3" />}
                                                {v.paymentStatus === 'WAIVED' && <XCircle className="w-3 h-3" />}
                                                {v.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/reception/visits/${v.id}`} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                                                <Eye className="w-3.5 h-3.5" /> View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filtered.length === 0 && (
                            <div className="py-12 text-center text-slate-400 text-sm">
                                {visits.length === 0 ? 'No visits recorded yet.' : 'No visits match your search.'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
