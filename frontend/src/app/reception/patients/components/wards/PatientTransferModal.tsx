"use client";

import React, { useState } from "react";
import { ArrowRight, User, AlertCircle, ShieldCheck, Stethoscope } from "lucide-react";
import { Bed, Ward } from "@/types/wards";

interface TransferModalProps {
    patient: { id: string; name: string };
    currentBed: Bed;
    allBeds: Bed[];
    wards: Ward[];
    onClose: () => void;
    onConfirm: (data: any) => void;
}

export default function PatientTransferModal({
    patient, currentBed, allBeds, wards, onClose, onConfirm
}: TransferModalProps) {
    const [targetWardId, setTargetWardId] = useState<string>("");
    const [targetBedId, setTargetBedId] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [authorizedBy, setAuthorizedBy] = useState<string>("");

    // Only show available beds in the destination ward
    const availableBeds = allBeds.filter(b => b.wardId === targetWardId && b.status === 'AVAILABLE');

    const handleTransfer = () => {
        onConfirm({
            fromBedId: currentBed.id,
            toBedId: targetBedId,
            reason,
            authorizedBy,
            timestamp: new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
                <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                    <div className="font-bold flex items-center gap-2">
                        <ArrowRight className="w-5 h-5" /> Patient Transfer Process
                    </div>
                    <button onClick={onClose} className="text-indigo-200 hover:text-white">✕</button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Transfer Summary */}
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="text-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">From</div>
                            <div className="text-sm font-bold">{currentBed.bedNumber}</div>
                        </div>
                        <ArrowRight className="text-slate-400 w-5 h-5" />
                        <div className="text-center">
                            <div className="text-[10px] font-bold text-indigo-500 uppercase">To</div>
                            <div className="text-sm font-bold text-indigo-700">
                                {targetBedId ? allBeds.find(b => b.id === targetBedId)?.bedNumber : "Select Bed"}
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Destination Ward</label>
                            <select
                                className="w-full border p-2 rounded text-sm"
                                onChange={(e) => { setTargetWardId(e.target.value); setTargetBedId(""); }}
                            >
                                <option value="">Select Ward...</option>
                                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>

                        {targetWardId && (
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Assign New Bed</label>
                                <select
                                    className="w-full border p-2 rounded text-sm"
                                    onChange={(e) => setTargetBedId(e.target.value)}
                                >
                                    <option value="">Select Available Bed...</option>
                                    {availableBeds.map(b => <option key={b.id} value={b.id}>{b.bedNumber}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Reason for Transfer</label>
                            <textarea
                                className="w-full border p-2 rounded text-sm"
                                rows={2}
                                placeholder="e.g. Clinical escalation to ICU, patient request..."
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Authorized By (Doctor/Nurse)</label>
                            <input
                                className="w-full border p-2 rounded text-sm"
                                onChange={(e) => setAuthorizedBy(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        disabled={!targetBedId || !reason || !authorizedBy}
                        onClick={handleTransfer}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-slate-300 transition"
                    >
                        Confirm & Execute Transfer
                    </button>
                </div>
            </div>
        </div>
    );
}