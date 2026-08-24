"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getErrorMessage } from "@/lib/utils";
import {
    CreditCard, Banknote, Landmark, Printer, CheckCircle2,
    Search, Clock, ShieldCheck, User, Receipt, ChevronRight,
    DollarSign, ArrowUpRight, Filter, Loader2, AlertCircle
} from "lucide-react";
import { CashierInvoiceSummary, PaymentMethod, PaymentRecord } from "@/types/billing";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function CashierDashboard() {
    const [invoices, setInvoices] = useState<CashierInvoiceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<CashierInvoiceSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Payment Form States
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
    const [amountPaying, setAmountPaying] = useState<number>(0);
    const [cashTendered, setCashTendered] = useState<number>(0);
    const [referenceNumber, setReferenceNumber] = useState<string>("");
    const [processing, setProcessing] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Print Modal
    const [completedPayment, setCompletedPayment] = useState<{
        invoice: CashierInvoiceSummary;
        payment: PaymentRecord;
    } | null>(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/billing/invoices`, { credentials: "include" });
            if (!res.ok) throw new Error(`Server returned code ${res.status}`);
            const data = await res.json();
            // Map keys of backend invoices format to front-end CashierInvoiceSummary keys
            const formatted = (data.invoices || []).map((inv: any) => ({
                invoiceNumber: inv.invoiceNumber,
                patientId: inv.patientId,
                patientName: inv.patientName || "Unknown Patient",
                mrn: inv.mrn || "Unknown MRN",
                grandTotal: parseFloat(inv.grandTotal) || 0,
                amountPaid: parseFloat(inv.amountPaid) || 0,
                balanceDue: parseFloat(inv.balanceDue) || 0,
                paymentStatus: inv.status, // maps 'status' field to paymentStatus
                generatedAt: inv.generatedAt ? new Date(inv.generatedAt).toLocaleString() : "",
                id: inv.id,
            }));
            setInvoices(formatted);
        } catch (err: any) {
            setFetchError(err.message || "Failed to load invoices queue.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleOpenPayment = (inv: CashierInvoiceSummary) => {
        setSelectedInvoice(inv);
        setAmountPaying(inv.balanceDue);
        setCashTendered(inv.balanceDue);
        setReferenceNumber("");
        setSubmitError(null);
    };

    const handleProcessPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        setProcessing(true);
        setSubmitError(null);

        const changeDue = paymentMethod === "CASH" ? Math.max(0, cashTendered - amountPaying) : 0;

        try {
            const res = await fetch(`${API_BASE_URL}/api/billing/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    invoiceId: (selectedInvoice as any).id,
                    amountPaid: amountPaying,
                    paymentMethod,
                    referenceNumber: referenceNumber || undefined,
                    cashTendered: paymentMethod === "CASH" ? cashTendered : undefined,
                    changeDue: paymentMethod === "CASH" ? changeDue : undefined,
                    cashierName: "Kenenisa Jaleto (Cashier #1)",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const newPaidTotal = selectedInvoice.amountPaid + amountPaying;
                const newBalance = Math.max(0, selectedInvoice.grandTotal - newPaidTotal);
                const newStatus = newBalance === 0 ? "PAID" : "PARTIALLY_PAID";

                const updatedInvoice: CashierInvoiceSummary = {
                    ...selectedInvoice,
                    amountPaid: newPaidTotal,
                    balanceDue: newBalance,
                    paymentStatus: newStatus,
                };

                const paymentRecord: PaymentRecord = {
                    id: data.payment.id || `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
                    invoiceNumber: selectedInvoice.invoiceNumber,
                    amountPaid: amountPaying,
                    paymentMethod,
                    referenceNumber: referenceNumber || undefined,
                    cashTendered: paymentMethod === "CASH" ? cashTendered : undefined,
                    changeDue: paymentMethod === "CASH" ? changeDue : undefined,
                    cashierName: "Kenenisa Jaleto (Cashier #1)",
                    processedAt: new Date().toLocaleString(),
                };

                setCompletedPayment({ invoice: updatedInvoice, payment: paymentRecord });
                setSelectedInvoice(null);
                fetchInvoices();
            } else {
                const err = await res.json();
                setSubmitError(getErrorMessage(err.error, "Payment process failed."));
            }
        } catch (err: any) {
            setSubmitError("A network error occurred.");
        } finally {
            setProcessing(false);
        }
    };

    const filteredInvoices = invoices.filter(
        (inv) =>
            (inv.patientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.invoiceNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.mrn || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cashier Desk & Billing Counter</h1>
                    <p className="text-sm text-slate-500">
                        Process payments (Cash, POS Card, Bank Transfer) and print official paper receipts.
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search invoice #, patient name, or MRN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Invoices Queue Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" /> Pending & Active Invoices Queue
                    </span>
                    <span className="text-xs text-slate-400">{filteredInvoices.length} Invoices Listed</span>
                </div>

                {loading ? (
                    <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-sm font-semibold">Loading queue...</span>
                    </div>
                ) : fetchError ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                        <p className="text-sm font-semibold">Failed to load invoices queue</p>
                        <p className="text-xs">{fetchError}</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-center">
                        <Receipt className="w-10 h-10 text-slate-200 mb-2" />
                        <p className="text-sm font-semibold">No invoices queue found.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase bg-slate-50">
                                <th className="py-3 px-4">Invoice # & Date</th>
                                <th className="py-3 px-4">Patient Information</th>
                                <th className="py-3 px-4 text-right">Grand Total</th>
                                <th className="py-3 px-4 text-right">Amount Paid</th>
                                <th className="py-3 px-4 text-right">Balance Due</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.invoiceNumber} className="hover:bg-slate-50 transition">
                                    <td className="py-3 px-4 font-mono">
                                        <div className="font-bold text-slate-800">{inv.invoiceNumber}</div>
                                        <div className="text-[10px] text-slate-400">{inv.generatedAt}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-slate-800">{inv.patientName}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">MRN: {inv.mrn}</div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-semibold">ETB {inv.grandTotal.toFixed(2)}</td>
                                    <td className="py-3 px-4 text-right font-mono text-emerald-700">ETB {inv.amountPaid.toFixed(2)}</td>
                                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                                        ETB {inv.balanceDue.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span
                                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inv.paymentStatus === "PAID"
                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                    : inv.paymentStatus === "PARTIALLY_PAID"
                                                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                        : "bg-rose-100 text-rose-800 border border-rose-200"
                                                }`}
                                        >
                                            {inv.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {inv.balanceDue > 0 ? (
                                            <button
                                                onClick={() => handleOpenPayment(inv)}
                                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold transition inline-flex items-center gap-1"
                                            >
                                                Collect Payment <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        ) : (
                                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                Paid / Settled
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Payment Processing Sliding Sidebar Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
                        <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-sm">Process Invoice Payment</div>
                                <div className="text-xs text-indigo-200 font-mono">{selectedInvoice.invoiceNumber}</div>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="text-indigo-300 hover:text-white text-lg">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleProcessPayment} className="p-5 space-y-4 text-xs">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                                <div className="text-slate-500 font-medium">Patient: <strong className="text-slate-800">{selectedInvoice.patientName}</strong></div>
                                <div className="text-slate-500 font-medium">Grand Total: <strong className="text-slate-800 font-mono">ETB {selectedInvoice.grandTotal.toFixed(2)}</strong></div>
                                <div className="text-slate-500 font-medium">Balance Due: <strong className="text-rose-600 font-mono">ETB {selectedInvoice.balanceDue.toFixed(2)}</strong></div>
                            </div>

                            {/* Select Payment Method */}
                            <div>
                                <label className="block text-slate-600 font-medium mb-1">Select Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["CASH", "POS_CARD", "BANK_TRANSFER"] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={`py-2 px-3 border rounded-lg font-bold text-center transition flex flex-col items-center justify-center gap-1 ${paymentMethod === method
                                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                                }`}
                                        >
                                            {method === "CASH" ? <Banknote className="w-4 h-4" /> : method === "POS_CARD" ? <CreditCard className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                                            <span className="text-[9px] uppercase tracking-wider">{method.replace("_", " ")}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Paying Amount */}
                            <div>
                                <label className="block text-slate-600 font-medium mb-1">Amount to Pay (ETB) *</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    max={selectedInvoice.balanceDue}
                                    value={amountPaying}
                                    onChange={(e) => {
                                        setAmountPaying(Number(e.target.value));
                                        if (paymentMethod === "CASH") setCashTendered(Number(e.target.value));
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            {/* Cash Input Helper */}
                            {paymentMethod === "CASH" && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-slate-600 font-medium mb-1">Cash Tendered (ETB)</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={cashTendered}
                                            onChange={(e) => setCashTendered(Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-medium mb-1">Change Due</label>
                                        <div className="w-full px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 font-mono font-bold text-slate-700">
                                            ETB {Math.max(0, cashTendered - amountPaying).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bank Transfer / POS Reference Field */}
                            {(paymentMethod === "BANK_TRANSFER" || paymentMethod === "POS_CARD") && (
                                <div>
                                    <label className="block text-slate-600 font-medium mb-1">
                                        {paymentMethod === "BANK_TRANSFER" ? "Bank Reference Number *" : "POS Approval Code *"}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder={paymentMethod === "BANK_TRANSFER" ? "e.g. CBE-FT-9910248" : "e.g. AUTH-88120"}
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                </div>
                            )}

                            {submitError && (
                                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> {submitError}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedInvoice(null)}
                                    className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                                >
                                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                    Confirm & Print Receipt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipt Print View Modal */}
            {completedPayment && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 p-6 space-y-4">
                        {/* Thermal Receipt Visual Container */}
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded font-mono text-xs text-slate-800 space-y-3">
                            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                                <div className="font-bold text-sm text-slate-900">ADDIS GENERAL HOSPITAL</div>
                                <div>Cashier Counter #1</div>
                                <div className="text-[10px] text-slate-500">Official Payment Receipt</div>
                            </div>

                            <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                    <span>Receipt No:</span>
                                    <span className="font-bold">{completedPayment.payment.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Invoice Ref:</span>
                                    <span>{completedPayment.invoice.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Patient:</span>
                                    <span className="font-semibold">{completedPayment.invoice.patientName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Date/Time:</span>
                                    <span>{completedPayment.payment.processedAt}</span>
                                </div>
                            </div>

                            <div className="py-2 border-y border-dashed border-slate-300 space-y-1">
                                <div className="flex justify-between">
                                    <span>Payment Method:</span>
                                    <span className="font-bold">{completedPayment.payment.paymentMethod}</span>
                                </div>
                                {completedPayment.payment.referenceNumber && (
                                    <div className="flex justify-between text-[10px] text-slate-600">
                                        <span>Ref/Tx ID:</span>
                                        <span>{completedPayment.payment.referenceNumber}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-bold pt-1">
                                    <span>Amount Paid:</span>
                                    <span>ETB {completedPayment.payment.amountPaid.toFixed(2)}</span>
                                </div>
                                {completedPayment.payment.changeDue !== undefined && (
                                    <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>Change Returned:</span>
                                        <span>ETB {completedPayment.payment.changeDue.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-center text-[10px] text-slate-400 pt-1">
                                Cashier: {completedPayment.payment.cashierName}<br />
                                Thank you for choosing Addis General.
                            </div>
                        </div>

                        {/* Print & Close Actions */}
                        <div className="flex justify-between items-center gap-2">
                            <button
                                onClick={() => setCompletedPayment(null)}
                                className="w-1/2 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Close Window
                            </button>
                            <button
                                onClick={() => {
                                    window.print();
                                }}
                                className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <Printer className="w-3.5 h-3.5" /> Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}