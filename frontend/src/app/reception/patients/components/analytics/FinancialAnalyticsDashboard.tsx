"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Banknote,
    Receipt,
    Wallet,
    AlertCircle,
    UserCheck,
    ArrowUpRight,
    Download,
    CreditCard,
    Loader2
} from "lucide-react";

interface CollectionSummary {
    paymentMethod: string;
    totalCollected: string | number | null;
    transactionCount: number;
}

interface CashierShift {
    cashierId: string | null;
    cashierName: string | null;
    totalCollected: string | number | null;
    receiptCount: number;
}

interface OutstandingBill {
    invoiceId: string;
    patientId: string;
    totalAmount: string | number;
    paidAmount: string | number;
    balanceDue: string | number;
    status: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function FinancialAnalyticsDashboard() {
    const [collections, setCollections] = useState<CollectionSummary[]>([]);
    const [cashiers, setCashiers] = useState<CashierShift[]>([]);
    const [outstanding, setOutstanding] = useState<OutstandingBill[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFinancialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/financial`, {
                credentials: "include"
            });
            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }
            const data = await res.json();
            setCollections(data.collections || []);
            setCashiers(data.cashierSummaries || []);
            setOutstanding(data.pendingInvoices || []);
        } catch (err: any) {
            console.error("Failed to fetch financial data:", err);
            setError(err.message || "Failed to compile financial reports");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFinancialData();
    }, [fetchFinancialData]);

    const totalCollectedToday = collections.reduce((acc, curr) => acc + Number(curr.totalCollected || 0), 0);
    const totalOutstanding = outstanding.reduce((acc, curr) => acc + Number(curr.balanceDue || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-sm text-slate-500 font-semibold">Loading financial data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-2" />
                <h2 className="text-lg font-bold text-slate-800">Financial Reports Unavailable</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-md">{error}</p>
                <button
                    onClick={fetchFinancialData}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                    Retry Loading Reports
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">

            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-emerald-600" /> Revenue & Financial Reports
                    </h1>
                    <p className="text-xs text-slate-500">Daily cashier reconciliations, channel tallies, and pending accounts.</p>
                </div>

                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition">
                    <Download className="w-4 h-4" /> Export Financial Summary
                </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Today's Collections</span>
                        <span className="text-2xl font-black text-slate-800">{totalCollectedToday.toLocaleString()} ETB</span>
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Reconciled & Closed
                        </span>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Unpaid Balances</span>
                        <span className="text-2xl font-black text-rose-600">{totalOutstanding.toLocaleString()} ETB</span>
                        <span className="text-[11px] font-bold text-slate-500 mt-1 block">{outstanding.length} High-Balance Accounts</span>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Cashiers Active Today</span>
                        <span className="text-2xl font-black text-slate-800">{cashiers.length} Cashier{cashiers.length === 1 ? "" : "s"}</span>
                        <span className="text-[11px] font-bold text-indigo-600 mt-1 block">
                            {cashiers.reduce((acc, c) => acc + c.receiptCount, 0)} Total Transactions
                        </span>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <UserCheck className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Middle Grid: Collections by Payment Channel & Cashier Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Payment Channels Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-600" /> Daily Revenue by Payment Channel
                        </h2>
                        <span className="text-xs text-slate-400 font-semibold">Today</span>
                    </div>

                    {collections.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 font-semibold">No collections recorded today.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {collections.map((item, idx) => (
                                <div key={idx} className="py-3 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-bold text-slate-800 block uppercase">{item.paymentMethod}</span>
                                        <span className="text-slate-400 text-[10px]">{item.transactionCount} receipts processed</span>
                                    </div>
                                    <span className="font-black text-slate-800 text-sm">
                                        {Number(item.totalCollected || 0).toLocaleString()} ETB
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cashier Shift Summaries */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-indigo-600" /> Cashier Shift Reconciliations
                        </h2>
                        <span className="text-xs text-slate-400 font-semibold">Active Shifts</span>
                    </div>

                    {cashiers.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 font-semibold">No active cashier shifts today.</div>
                    ) : (
                        <div className="space-y-3">
                            {cashiers.map((c, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-bold text-slate-800 block">{c.cashierName || "Unknown Cashier"}</span>
                                        <span className="text-[10px] text-slate-500 font-semibold">{c.receiptCount} Transactions</span>
                                    </div>
                                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100">
                                        {Number(c.totalCollected || 0).toLocaleString()} ETB
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Outstanding Invoices Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600" /> High Outstanding Patient Balances
                    </h2>
                    <span className="text-xs text-slate-400 font-semibold">Unsettled Accounts</span>
                </div>

                {outstanding.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-semibold">No outstanding patient balances.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                                    <th className="py-2 px-3">Invoice #</th>
                                    <th className="py-2 px-3">Patient ID</th>
                                    <th className="py-2 px-3">Status</th>
                                    <th className="py-2 px-3">Total Invoiced</th>
                                    <th className="py-2 px-3 text-right">Balance Due</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {outstanding.map((bill) => (
                                    <tr key={bill.invoiceId} className="hover:bg-slate-50 transition">
                                        <td className="py-3 px-3 font-bold text-indigo-600">INV-{bill.invoiceId.substring(0, 8).toUpperCase()}</td>
                                        <td className="py-3 px-3 font-mono text-slate-800">{bill.patientId}</td>
                                        <td className="py-3 px-3">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                {bill.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-slate-500">{Number(bill.totalAmount).toLocaleString()} ETB</td>
                                        <td className="py-3 px-3 text-right font-black text-rose-600">{Number(bill.balanceDue).toLocaleString()} ETB</td>
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