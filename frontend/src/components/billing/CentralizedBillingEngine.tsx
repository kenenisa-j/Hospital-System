"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getErrorMessage } from "@/lib/utils";
import {
    Receipt, Search, Stethoscope, FlaskConical, Radio,
    Pill, BedDouble, Plus, Trash2, BadgePercent, CreditCard,
    FileText, CheckCircle2, User, ChevronRight, Calculator,
    Loader2, AlertCircle
} from "lucide-react";
import { UnbilledChargeItem, PatientBillingLedger, MasterInvoice } from "@/types/billing";

interface Patient {
    id: string;
    fullName: string;
    mrn: string;
    phoneNumber: string;
}

interface Service {
    id: string;
    code: string;
    name: string;
    category: string;
    unitPrice: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function CentralizedBillingEngine() {
    const [patientsList, setPatientsList] = useState<Patient[]>([]);
    const [servicesList, setServicesList] = useState<Service[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    const [unbilledItems, setUnbilledItems] = useState<UnbilledChargeItem[]>([]);
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(15); // Default 15% VAT
    const [generatedInvoice, setGeneratedInvoice] = useState<MasterInvoice | null>(null);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Load initial patient list and services list
    const fetchData = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const [pRes, sRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/patients`, { credentials: "include" }),
                fetch(`${API_BASE_URL}/api/services`, { credentials: "include" })
            ]);

            if (pRes.ok) {
                const pData = await pRes.json();
                setPatientsList(pData.patients || []);
            }
            if (sRes.ok) {
                const sData = await sRes.json();
                setServicesList(sData.services || []);
            }
        } catch (err: any) {
            setErrorMsg("Failed to connect to HMS API services.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activePatient = useMemo(() => {
        return patientsList.find(p => p.id === selectedPatientId) || null;
    }, [patientsList, selectedPatientId]);

    // Category Icon Mapper
    const getCategoryBadge = (category: string) => {
        switch (category) {
            case "CONSULTATION":
                return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200"><Stethoscope className="w-3 h-3" /> Consultation</span>;
            case "LABORATORY":
                return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200"><FlaskConical className="w-3 h-3" /> Lab</span>;
            case "RADIOLOGY":
                return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200"><Radio className="w-3 h-3" /> Radiology</span>;
            case "PHARMACY":
                return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200"><Pill className="w-3 h-3" /> Pharmacy</span>;
            case "ACCOMMODATION":
            case "INPATIENT_ROOM":
                return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200"><BedDouble className="w-3 h-3" /> Admission</span>;
            default:
                return <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Other</span>;
        }
    };

    // Add service from catalog to unbilled items
    const handleAddService = (serviceId: string) => {
        const svc = servicesList.find(s => s.id === serviceId);
        if (!svc) return;

        const price = parseFloat(svc.unitPrice) || 0;
        const newItem: UnbilledChargeItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            category: svc.category as any,
            serviceName: svc.name,
            unitPrice: price,
            quantity: 1,
            amount: price,
            performerOrDoctor: "Billing Desk",
            orderedAt: new Date().toLocaleString(),
            sourceReferenceId: svc.code,
        };

        setUnbilledItems(prev => [...prev, newItem]);
    };

    const handleQuantityChange = (itemId: string, qty: number) => {
        setUnbilledItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newQty = Math.max(1, qty);
                return {
                    ...item,
                    quantity: newQty,
                    amount: item.unitPrice * newQty
                };
            }
            return item;
        }));
    };

    // Calculations
    const subtotal = useMemo(() => {
        return unbilledItems.reduce((sum, item) => sum + item.amount, 0);
    }, [unbilledItems]);

    const discountAmount = useMemo(() => {
        return (subtotal * discountPercent) / 100;
    }, [subtotal, discountPercent]);

    const taxableAmount = useMemo(() => {
        return Math.max(0, subtotal - discountAmount);
    }, [subtotal, discountAmount]);

    const taxAmount = useMemo(() => {
        return (taxableAmount * taxRate) / 100;
    }, [taxableAmount, taxRate]);

    const grandTotal = useMemo(() => {
        return taxableAmount + taxAmount;
    }, [taxableAmount, taxAmount]);

    const handleRemoveItem = (itemId: string) => {
        setUnbilledItems((prev) => prev.filter((i) => i.id !== itemId));
    };

    const handleGenerateInvoice = async () => {
        if (!selectedPatientId) {
            setErrorMsg("Please select a patient first.");
            return;
        }
        setSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/billing/invoices`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    patientId: selectedPatientId,
                    items: unbilledItems.map(item => ({
                        serviceCode: item.sourceReferenceId,
                        description: item.serviceName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                    })),
                    notes: `VAT: ${taxRate}%, Discount: ${discountPercent}%`
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const invoice: MasterInvoice = {
                    invoiceNumber: data.invoice.invoiceNumber,
                    patientId: selectedPatientId,
                    patientName: activePatient?.fullName || "Unknown",
                    items: unbilledItems,
                    subtotal,
                    discountAmount,
                    taxRate,
                    taxAmount,
                    grandTotal,
                    paymentStatus: "UNPAID",
                    generatedAt: new Date().toLocaleString(),
                };
                setGeneratedInvoice(invoice);
                setUnbilledItems([]);
            } else {
                const err = await res.json();
                setErrorMsg(getErrorMessage(err.error, "Failed to generate master invoice."));
            }
        } catch (err: any) {
            setErrorMsg("Network error generating invoice.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPatients = patientsList.filter(
        p => p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-800">Centralized Billing Engine</h1>
                        <span className="bg-emerald-100 text-emerald-800 font-semibold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">
                            HMS Connected
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Consolidating and generating master bills for clinical services and accommodations.
                    </p>
                </div>
            </div>

            {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Patient selection & Unbilled Services Ledger */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Patient Selector */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-full md:w-1/2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Select Patient *</label>
                            <select
                                value={selectedPatientId}
                                onChange={(e) => {
                                    setSelectedPatientId(e.target.value);
                                    setGeneratedInvoice(null);
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option value="">-- Choose Patient --</option>
                                {patientsList.map(p => (
                                    <option key={p.id} value={p.id}>{p.fullName} ({p.mrn})</option>
                                ))}
                            </select>
                        </div>

                        {selectedPatientId && (
                            <div className="w-full md:w-1/2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Add Catalog Service</label>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleAddService(e.target.value);
                                            e.target.value = ""; // Reset
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="">-- Select Service to Bill --</option>
                                    {servicesList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code}) - ETB {parseFloat(s.unitPrice).toFixed(2)}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {activePatient && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Patient Context Banner */}
                            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 rounded-lg">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{activePatient.fullName}</div>
                                        <div className="text-xs text-slate-300 font-mono">
                                            MRN: {activePatient.mrn} • Phone: {activePatient.phoneNumber}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full">
                                    {unbilledItems.length} Bill Items
                                </span>
                            </div>

                            {/* Line Items Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                            <th className="py-3 px-4">Service Category</th>
                                            <th className="py-3 px-4">Service Description</th>
                                            <th className="py-3 px-4 text-center">Unit Price</th>
                                            <th className="py-3 px-4 text-center">Qty</th>
                                            <th className="py-3 px-4 text-right">Amount (ETB)</th>
                                            <th className="py-3 px-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                        {unbilledItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                                <td className="py-3 px-4">{getCategoryBadge(item.category)}</td>
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-800">{item.serviceName}</div>
                                                    <div className="text-[10px] text-slate-400">Code: {item.sourceReferenceId}</div>
                                                </td>
                                                <td className="py-3 px-4 text-center font-mono">{item.unitPrice.toFixed(2)}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                                        className="w-12 px-1 py-0.5 border text-center font-semibold rounded bg-white"
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                                                    {item.amount.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="text-slate-400 hover:text-rose-600 transition p-1"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {unbilledItems.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                                    No pending bill items added yet. Choose services from catalog above.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Calculations & Master Invoice Generation */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Calculator className="w-4 h-4 text-indigo-600" /> Invoice Breakdown
                        </h3>

                        {/* Calculations Breakdown */}
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Aggregated Subtotal</span>
                                <span className="font-mono font-semibold text-slate-800 text-sm">
                                    ETB {subtotal.toFixed(2)}
                                </span>
                            </div>

                            {/* Discount Input */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                <label className="text-slate-600 flex items-center gap-1">
                                    <BadgePercent className="w-3.5 h-3.5 text-amber-500" /> Discount (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            {discountPercent > 0 && (
                                <div className="flex justify-between items-center text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                    <span>Discount Savings</span>
                                    <span className="font-mono font-semibold">- ETB {discountAmount.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Tax Rate Input */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                <label className="text-slate-600">VAT Tax Rate (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(Number(e.target.value))}
                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            <div className="flex justify-between items-center text-slate-600">
                                <span>Tax Amount ({taxRate}%)</span>
                                <span className="font-mono font-semibold text-slate-800">
                                    ETB {taxAmount.toFixed(2)}
                                </span>
                            </div>

                            {/* Grand Total */}
                            <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center text-slate-900 font-bold text-base">
                                <span>Grand Total</span>
                                <span className="font-mono text-indigo-700 text-lg">
                                    ETB {grandTotal.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            disabled={unbilledItems.length === 0 || submitting}
                            onClick={handleGenerateInvoice}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                            Generate Master Invoice
                        </button>
                    </div>

                    {/* Generated Invoice Preview Card */}
                    {generatedInvoice && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-emerald-800">
                                <span className="font-bold text-xs flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Invoice Generated
                                </span>
                                <span className="font-mono text-[11px] font-semibold">{generatedInvoice.invoiceNumber}</span>
                            </div>
                            <p className="text-[11px] text-emerald-700">
                                Master bill ready for cashier checkout and counter receipt printing.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}