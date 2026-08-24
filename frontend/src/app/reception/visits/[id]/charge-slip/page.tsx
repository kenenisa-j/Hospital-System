"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    Receipt,
    User,
    Building2,
    CreditCard,
    Printer,
    CheckCircle2,
    ArrowRight,
    Clock,
    AlertCircle,
    Loader2,
    DollarSign,
    ArrowLeft,
    FileText,
} from "lucide-react";

// --- Types ---
interface VisitDetails {
    id: string;
    ticketNumber: string;
    department: string;
    triagePriority: string;
    paymentType: "CASH" | "INSURANCE" | "FREE_SCHEME";
    createdAt: string;
    patient: {
        id: string;
        mrn: string;
        fullName: string;
        phoneNumber: string;
        insuranceProvider?: string;
        insurancePolicyNumber?: string;
    };
    doctor?: {
        id: string;
        fullName: string;
    };
}

interface ChargeItem {
    id: string;
    description: string;
    code: string;
    amount: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function InitialChargeSlipPage() {
    const params = useParams();
    const router = useRouter();
    const visitId = params?.id as string;

    const [visit, setVisit] = useState<VisitDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Billing calculation states
    const [consultationFee, setConsultationFee] = useState<number>(150.00); // Default standard fee
    const [registrationFee, setRegistrationFee] = useState<number>(50.00);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [chargeSlipIssued, setChargeSlipIssued] = useState<boolean>(false);
    const [invoiceNumber, setInvoiceNumber] = useState<string>("");

    // Fetch visit context
    const fetchVisitDetails = useCallback(async () => {
        if (!visitId) return;
        setLoading(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/visits/${visitId}`, {
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error("Failed to load visit record.");
            }

            const data = await res.json();
            setVisit(data.visit);

            // Auto-adjust default fee based on department or payment plan
            if (data.visit.paymentType === "FREE_SCHEME") {
                setConsultationFee(0);
                setRegistrationFee(0);
            } else if (data.visit.department === "Emergency") {
                setConsultationFee(300.00);
            }
        } catch (err: any) {
            setErrorMsg(err.message || "An error occurred while fetching visit data.");
        } finally {
            setLoading(false);
        }
    }, [visitId]);

    useEffect(() => {
        fetchVisitDetails();
    }, [fetchVisitDetails]);

    // Calculations
    const subtotal = consultationFee + registrationFee;
    const totalAmount = Math.max(0, subtotal - discountAmount);

    // Generate Charge Slip & Dispatch to Billing
    const handleIssueChargeSlip = async () => {
        if (!visit) return;
        setSubmitting(true);
        setErrorMsg(null);

        const invoicePayload = {
            visitId: visit.id,
            patientId: visit.patient.id,
            paymentType: visit.paymentType,
            items: [
                { description: `Consultation Fee (${visit.department})`, amount: consultationFee, code: "CONS-01" },
                { description: "Patient Registration & Card Fee", amount: registrationFee, code: "REG-01" },
            ],
            discountAmount,
            totalAmount,
            status: visit.paymentType === "FREE_SCHEME" ? "PAID" : "PENDING_PAYMENT",
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/billing/charge-slips`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(invoicePayload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to generate charge slip.");
            }

            const responseData = await res.json();
            setInvoiceNumber(responseData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
            setChargeSlipIssued(true);
        } catch (err: any) {
            setErrorMsg(err.message || "Could not dispatch charge slip to Cashier.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-500">Retrieving Visit Details...</p>
            </div>
        );
    }

    if (errorMsg && !visit) {
        return (
            <div className="max-w-xl mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-lg text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <h2 className="text-base font-bold text-rose-900">Unable to Proceed</h2>
                <p className="text-xs text-rose-700">{errorMsg}</p>
                <button
                    onClick={() => router.push("/reception/dashboard")}
                    className="mt-2 px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-900 transition"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "RECEPTIONIST"]}>
            <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">

                {/* Navigation Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/reception/dashboard")}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Receipt className="w-6 h-6 text-sky-600" />
                                Initial Visit Charge Slip
                            </h1>
                            <p className="text-sm text-slate-500">
                                Issue consultation invoice and queue patient for Cashier payment clearance.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Success Confirmation / Print View */}
                {chargeSlipIssued ? (
                    <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-md space-y-6 max-w-xl mx-auto">
                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Charge Slip Issued Successfully!</h2>
                            <p className="text-xs text-slate-500">
                                Invoice <span className="font-mono font-bold text-slate-800">{invoiceNumber}</span> created.
                            </p>
                        </div>

                        {/* Instruction Card */}
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs text-amber-900">
                            <div className="font-bold flex items-center gap-1.5 text-amber-800">
                                <Clock className="w-4 h-4 text-amber-600" />
                                Next Step: Direct Patient to Cashier
                            </div>
                            <p>
                                Patient <b>{visit?.patient.fullName}</b> is currently on <b>PENDING PAYMENT</b> status.
                                Once paid at the Cashier counter, the ticket status will automatically activate on Doctor&apos;s queue.
                            </p>
                        </div>

                        {/* Summary Details */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Patient Name:</span>
                                <span className="font-bold text-slate-800">{visit?.patient.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">MRN:</span>
                                <span className="font-mono font-bold text-slate-800">{visit?.patient.mrn}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Queue Ticket:</span>
                                <span className="font-mono font-bold text-sky-700">{visit?.ticketNumber}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-sm">
                                <span>Total Due:</span>
                                <span>${totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md transition flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" /> Print Charge Slip
                            </button>
                            <button
                                onClick={() => router.push("/reception/dashboard")}
                                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-md transition flex items-center justify-center gap-2"
                            >
                                Done / Dashboard <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Form Layout */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Left: Visit & Patient Info */}
                        <div className="md:col-span-1 bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                <User className="w-4 h-4 text-sky-600" /> Patient Summary
                            </h2>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Patient Name</span>
                                    <p className="font-bold text-slate-800 text-sm">{visit?.patient.fullName}</p>
                                </div>

                                <div>
                                    <span className="text-slate-400 block">MRN</span>
                                    <p className="font-mono font-bold text-slate-700">{visit?.patient.mrn}</p>
                                </div>

                                <div>
                                    <span className="text-slate-400 block">Assigned Queue Ticket</span>
                                    <p className="font-mono font-extrabold text-sky-700 text-base">{visit?.ticketNumber}</p>
                                </div>

                                <div className="border-t border-slate-100 pt-3">
                                    <span className="text-slate-400 block">Department & Doctor</span>
                                    <p className="font-semibold text-slate-800">{visit?.department}</p>
                                    <p className="text-slate-500">{visit?.doctor?.fullName || "Next Available Doctor"}</p>
                                </div>

                                <div>
                                    <span className="text-slate-400 block">Payment Scheme</span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 inline-block mt-1">
                                        {visit?.paymentType}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Charge Itemization Form */}
                        <div className="md:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                                Fee Breakdown & Charge Configuration
                            </h2>

                            {errorMsg && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Line Items */}
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-slate-500 border-b border-slate-100 pb-1">
                                    <span className="col-span-2">Fee Description</span>
                                    <span className="text-right">Amount ($)</span>
                                </div>

                                <div className="grid grid-cols-3 gap-3 items-center text-xs">
                                    <div className="col-span-2">
                                        <p className="font-semibold text-slate-800">Doctor Consultation Fee</p>
                                        <p className="text-[11px] text-slate-400">Base OPD Consultation tariff</p>
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={consultationFee}
                                            onChange={(e) => setConsultationFee(parseFloat(e.target.value) || 0)}
                                            className="w-full text-right px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 text-xs font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 items-center text-xs">
                                    <div className="col-span-2">
                                        <p className="font-semibold text-slate-800">Registration / Card Opening</p>
                                        <p className="text-[11px] text-slate-400">Standard administrative processing</p>
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={registrationFee}
                                            onChange={(e) => setRegistrationFee(parseFloat(e.target.value) || 0)}
                                            className="w-full text-right px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 text-xs font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Discount input */}
                                <div className="grid grid-cols-3 gap-3 items-center text-xs pt-2 border-t border-slate-100">
                                    <div className="col-span-2">
                                        <p className="font-semibold text-slate-600">Discount / Waiver Amount</p>
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={discountAmount}
                                            onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full text-right px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-sky-500 text-xs font-medium text-rose-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Total Summary */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal:</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-rose-600">
                                        <span>Discount applied:</span>
                                        <span>-${discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                                    <span>Total Payable:</span>
                                    <span className="text-emerald-700">${totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                type="button"
                                onClick={handleIssueChargeSlip}
                                disabled={submitting}
                                className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating Charge Slip...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-4 h-4" />
                                        Issue Charge Slip & Send Patient to Cashier
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}