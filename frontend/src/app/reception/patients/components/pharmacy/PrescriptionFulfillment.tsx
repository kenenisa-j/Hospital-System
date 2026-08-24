"use client";

import React, { useState } from 'react';
import {
    CheckCircle2, AlertCircle, ShoppingBag, User, Stethoscope,
    Package, ArrowRight, ShieldCheck, Clock, FileText, Check
} from 'lucide-react';
import { StockBatch, DoctorPrescription } from '@/types/pharmacy';

export default function PrescriptionFulfillment() {
    const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>([]);
    const [batches, setBatches] = useState<StockBatch[]>([]);
    const [selectedRx, setSelectedRx] = useState<DoctorPrescription | null>(null);

    // Map to store chosen batch ID per item in active prescription
    const [batchSelections, setBatchSelections] = useState<Record<string, string>>({});

    const handleBatchChange = (itemId: string, batchId: string) => {
        setBatchSelections((prev) => ({ ...prev, [itemId]: batchId }));
    };

    const handleDispensePrescription = (rxId: string) => {
        if (!selectedRx) return;

        // Update prescription status
        setPrescriptions((prev) =>
            prev.map((rx) => (rx.id === rxId ? { ...rx, status: 'DISPENSED' } : rx))
        );

        setSelectedRx(null);
        alert('Prescription successfully fulfilled!');
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Prescription Fulfillment Queue</h1>
                <p className="text-sm text-slate-500">
                    Review physician orders, verify automated FEFO batch allocations, and dispense medicines.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Orders Queue */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-100">
                        <span>Pending Orders ({prescriptions.filter((p) => p.status === 'PENDING').length})</span>
                        <Clock className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="space-y-2">
                        {prescriptions.map((rx) => (
                            <div
                                key={rx.id}
                                onClick={() => {
                                    setSelectedRx(rx);
                                    const updatedSelections: Record<string, string> = {};
                                    rx.items.forEach((item) => {
                                        const fefoBatch = batches
                                            .filter((b) => b.medicineId === item.medicineId && b.quantityOnHand >= item.prescribedQty)
                                            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
                                        if (fefoBatch) updatedSelections[item.id] = fefoBatch.id;
                                    });
                                    setBatchSelections(updatedSelections);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition ${selectedRx?.id === rx.id
                                        ? 'border-blue-500 bg-blue-50/50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm">{rx.patientName}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Stethoscope className="w-3 h-3 text-slate-400" /> {rx.doctorName}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rx.status === 'DISPENSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                        {rx.status}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-2 flex justify-between items-center">
                                    <span>{rx.items.length} prescribed items</span>
                                    <span>{rx.prescribedDate.split(' ')[1]}</span>
                                </div>
                            </div>
                        ))}

                        {prescriptions.length === 0 && (
                            <div className="text-center py-8 text-xs text-slate-400">
                                No prescriptions in the queue.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Active Order Dispensing Screen */}
                <div className="lg:col-span-2 space-y-4">
                    {selectedRx ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                            {/* Patient & Doctor Context Header */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <span className="font-bold text-slate-800 text-base">{selectedRx.patientName}</span>
                                        <span className="text-xs font-mono text-slate-400">({selectedRx.patientId})</span>
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                        <span>Prescribed by: <strong className="text-slate-700">{selectedRx.doctorName}</strong></span>
                                        <span>•</span>
                                        <span>Rx ID: <strong className="font-mono text-slate-700">{selectedRx.id}</strong></span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Pharmacist Double-Check Active
                                </div>
                            </div>

                            {/* Items Table & FEFO Batch Selector */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" /> Prescribed Medications & Batch Allocation
                                </h3>

                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                                                <th className="py-3 px-4">Medication & Instructions</th>
                                                <th className="py-3 px-4 text-center">Qty Required</th>
                                                <th className="py-3 px-4">Allocated Batch (FEFO Priority)</th>
                                                <th className="py-3 px-4 text-right">Stock Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {selectedRx.items.map((item) => {
                                                const availableBatches = batches.filter((b) => b.medicineId === item.medicineId);
                                                const selectedBatchId = batchSelections[item.id];
                                                const activeBatch = availableBatches.find((b) => b.id === selectedBatchId);
                                                const isStockSufficient = activeBatch ? activeBatch.quantityOnHand >= item.prescribedQty : false;

                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                                        <td className="py-3 px-4">
                                                            <div className="font-bold text-slate-800 text-sm">{item.medicineName}</div>
                                                            <div className="text-slate-500 italic mt-0.5">{item.dosage}</div>
                                                        </td>

                                                        <td className="py-3 px-4 text-center font-bold text-slate-800 text-sm">
                                                            {item.prescribedQty}
                                                        </td>

                                                        <td className="py-3 px-4">
                                                            <select
                                                                value={selectedBatchId || ''}
                                                                onChange={(e) => handleBatchChange(item.id, e.target.value)}
                                                                className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                                                            >
                                                                <option value="">-- No batch selected --</option>
                                                                {availableBatches.map((b) => (
                                                                    <option key={b.id} value={b.id}>
                                                                        {b.batchNumber} (Exp: {b.expiryDate}) — {b.quantityOnHand} in stock
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="text-[10px] text-indigo-600 font-medium mt-1 flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> System matched earliest expiring batch
                                                            </div>
                                                        </td>

                                                        <td className="py-3 px-4 text-right">
                                                            {isStockSufficient ? (
                                                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold text-[11px] border border-emerald-200">
                                                                    <CheckCircle2 className="w-3 h-3" /> Available
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded font-semibold text-[11px] border border-red-200">
                                                                    <AlertCircle className="w-3 h-3" /> Low Stock
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setSelectedRx(null)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                                >
                                    Cancel / Keep Pending
                                </button>

                                <button
                                    disabled={selectedRx.status === 'DISPENSED'}
                                    onClick={() => handleDispensePrescription(selectedRx.id)}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm transition"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    {selectedRx.status === 'DISPENSED' ? 'Already Dispensed' : 'Dispense & Deduct Inventory'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                            <Package className="w-12 h-12 mx-auto text-slate-300" />
                            <div className="font-semibold text-slate-600">No Prescription Selected</div>
                            <p className="text-xs">Choose an active order from the left queue to verify and dispense medication.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}