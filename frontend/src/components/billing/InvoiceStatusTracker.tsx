"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Clock, CheckCircle2, AlertCircle, RefreshCw, Undo2,
    Search, Filter, ShieldAlert, FileText, User, ArrowRightLeft,
    Check, XCircle, DollarSign, FileCheck, Loader2
} from "lucide-react";
import { DetailedInvoiceSummary, InvoiceStatus, RefundRecord } from "@/types/billing";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function InvoiceStatusTracker() {
    const [invoices, setInvoices] = useState<DetailedInvoiceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Modal State for Refund Processing
    const [refundModalInvoice, setRefundModalInvoice] = useState<DetailedInvoiceSummary | null>(null);
    const [refundAmount, setRefundAmount] = useState<number>(0);
    const [refundReason, setRefundReason] = useState<string>("");

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/billing/invoices`, { credentials: "include" });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            // Parse decimal values to number to match interface
            const formatted = (data.invoices || []).map((inv: any) => ({
                ...inv,
                grandTotal: parseFloat(inv.grandTotal) || 0,
                amountPaid: parseFloat(inv.amountPaid) || 0,
                balanceDue: parseFloat(inv.balanceDue) || 0,
            }));
            setInvoices(formatted);
        } catch (err: any) {
            setFetchError(err.message || "Failed to load invoices.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleOpenRefund = (inv: DetailedInvoiceSummary) => {
        setRefundModalInvoice(inv);
        setRefundAmount(inv.amountPaid);
        setRefundReason("");
    };

    const handleProcessRefund = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!refundModalInvoice) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/billing/refunds`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    invoiceId: (refundModalInvoice as any).id,
                    refundAmount,
                    reason: refundReason,
                    approvedBy: "Finance Admin",
                }),
            });
            if (res.ok) {
                fetchInvoices();
                setRefundModalInvoice(null);
            }
        } catch (err) {
            console.error("Refund failed:", err);
        }
    };

    // Status Badge Helper
    const getStatusBadge = (status: InvoiceStatus) => {
        switch (status) {
            case "PAID":
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PAID
                    </span>
                );
            case "PARTIAL":
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> PARTIAL
                    </span>
                );
            case "UNPAID":
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> UNPAID
                    </span>
                );
            case "REFUNDED":
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
                        <Undo2 className="w-3.5 h-3.5 text-purple-600" /> REFUNDED
                    </span>
                );
            case "CANCELLED":
            default:
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                        <XCircle className="w-3.5 h-3.5 text-slate-400" /> CANCELLED
                    </span>
                );
        }
    };

    const filteredInvoices = invoices.filter((inv) => {
        const matchesSearch =
            (inv.patientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.mrn || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Calculate Metrics
    const totalUnpaid = invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL').reduce((s, i) => s + i.balanceDue, 0);
    const totalPaid = invoices.filter(i => i.status === 'PAID' || i.status === 'PARTIAL').reduce((s, i) => s + i.amountPaid, 0);
    const totalRefunded = invoices.filter(i => i.status === 'REFUNDED').reduce((s, i) => s + i.amountPaid, 0);

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
            {/* Page Title */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Invoice Lifecycle & Status Tracking</h1>
                    <p className="text-sm text-slate-500">
                        Monitor real-time payment states (UNPAID, PARTIAL, PAID, REFUNDED), audit updates, and process refunds.
                    </p>
                </div>
                <button
                    onClick={fetchInvoices}
                    className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 transition"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-rose-200 p-4 rounded-xl shadow-xs flex justify-between items-center">
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase">Receivables (Unpaid / Partial)</div>
                        <div className="text-xl font-bold font-mono text-rose-600 mt-1">ETB {totalUnpaid.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white border border-emerald-200 p-4 rounded-xl shadow-xs flex justify-between items-center">
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase">Total Settled (Paid)</div>
                        <div className="text-xl font-bold font-mono text-emerald-600 mt-1">ETB {totalPaid.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white border border-purple-200 p-4 rounded-xl shadow-xs flex justify-between items-center">
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase">Total Refunded Volume</div>
                        <div className="text-xl font-bold font-mono text-purple-600 mt-1">ETB {totalRefunded.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <Undo2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search invoice number, patient name, or MRN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="UNPAID">UNPAID</option>
                        <option value="PARTIAL">PARTIAL</option>
                        <option value="PAID">PAID</option>
                        <option value="REFUNDED">REFUNDED</option>
                    </select>
                </div>
            </div>

            {/* Main Directory Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-slate-400" /> Invoice Master Ledger
                    </span>
                    <span className="text-xs text-slate-400">{filteredInvoices.length} Invoices Found</span>
                </div>

                {loading ? (
                    <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-sm font-semibold">Loading ledger...</span>
                    </div>
                ) : fetchError ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                        <p className="text-sm font-semibold">Failed to load invoices</p>
                        <p className="text-xs">{fetchError}</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-center">
                        <FileText className="w-10 h-10 text-slate-200 mb-2" />
                        <p className="text-sm font-semibold">No invoices found matching current criteria.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50">
                                <th className="py-3 px-4">Invoice # & Date</th>
                                <th className="py-3 px-4">Patient Information</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-right">Grand Total</th>
                                <th className="py-3 px-4 text-right">Paid Amount</th>
                                <th className="py-3 px-4 text-right">Balance Due</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.invoiceNumber} className="hover:bg-slate-50 transition">
                                    <td className="py-3 px-4 font-mono">
                                        <div className="font-bold text-slate-800">{inv.invoiceNumber}</div>
                                        <div className="text-[10px] text-slate-400">{inv.generatedAt ? new Date(inv.generatedAt).toLocaleString() : ""}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-slate-800">{inv.patientName}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">MRN: {inv.mrn}</div>
                                    </td>
                                    <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>
                                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                                        ETB {inv.grandTotal.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono text-emerald-700">
                                        ETB {inv.amountPaid.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                                        ETB {inv.balanceDue.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {(inv.status === "PAID" || inv.status === "PARTIAL") && (
                                            <button
                                                onClick={() => handleOpenRefund(inv)}
                                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 mx-auto transition"
                                            >
                                                <Undo2 className="w-3 h-3" /> Issue Refund
                                            </button>
                                        )}
                                        {inv.status === "REFUNDED" && inv.refunds && inv.refunds.length > 0 && (
                                            <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                                                Ref: {inv.refunds[0].id}
                                            </span>
                                        )}
                                        {inv.status === "UNPAID" && (
                                            <span className="text-[10px] italic text-slate-400">Awaiting Cashier</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Refund Processing Modal */}
            {refundModalInvoice && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
                        <div className="bg-purple-900 text-white p-4 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-sm">Issue Authorized Refund</div>
                                <div className="text-xs text-purple-200 font-mono">{refundModalInvoice.invoiceNumber}</div>
                            </div>
                            <button onClick={() => setRefundModalInvoice(null)} className="text-purple-300 hover:text-white text-lg">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleProcessRefund} className="p-5 space-y-4 text-xs">
                            <div className="bg-purple-50/70 p-3 rounded-lg border border-purple-200 space-y-1">
                                <div className="font-bold text-purple-900">{refundModalInvoice.patientName}</div>
                                <div className="text-[11px] text-purple-700">
                                    Total Eligible Paid Amount: <strong className="font-mono">ETB {refundModalInvoice.amountPaid.toFixed(2)}</strong>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-600 font-medium mb-1">Refund Amount (ETB) *</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    max={refundModalInvoice.amountPaid}
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-600 font-medium mb-1">Reason for Refund / Cancellation *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="e.g. Service cancelled by clinician, duplicate billing, erroneous lab order"
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-xs bg-white"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setRefundModalInvoice(null)}
                                    className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-sm"
                                >
                                    Confirm & Log Refund
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}