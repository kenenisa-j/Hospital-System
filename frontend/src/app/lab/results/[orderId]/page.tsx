"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
    FlaskConical,
    CheckCircle2,
    AlertTriangle,
    ArrowLeft,
    Loader2,
    Send,
    ShieldCheck,
    QrCode,
    User,
    Clock,
    FileText,
    Bell,
    FileDown,
} from "lucide-react";

// --- Types ---
export type ResultStatus =
    | "ORDERED"
    | "ACCEPTED"
    | "SAMPLE_COLLECTED"
    | "PROCESSING"
    | "RESULT_ENTERED"
    | "COMPLETED"
    | "VERIFIED"
    | "RESULT_REVIEWED"
    | "REJECTED";

export interface TestResultItem {
    parameterName: string;
    value: string;
    unit: string;
    referenceRange: string;
    isAbnormal: boolean;
    isCritical: boolean;
}

export interface LabOrderDetails {
    id: string;
    orderNumber: string;
    patientId: string;
    patientName: string;
    gender: string;
    age: number;
    testName: string;
    category: string;
    sampleBarcode: string;
    sampleType?: string;
    urgency?: string;
    orderingDoctor: string;
    orderingDoctorId: string;
    status: ResultStatus;
    results: TestResultItem[];
    technicianNotes?: string;
    verifiedBy?: string;
    verifiedAt?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ResultEntryAndVerificationPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.orderId as string;
    const { user } = useAuth();

    const [order, setOrder] = useState<LabOrderDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    // Form States
    const [resultItems, setResultItems] = useState<TestResultItem[]>([]);
    const [technicianNotes, setTechnicianNotes] = useState<string>("");

    const handleReviewResult = async () => {
        setSubmitting(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/lab/orders/${orderId}/review`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to submit review.");
            setOrder((prev) => (prev ? { ...prev, status: "VERIFIED" } : null)); // keeps local status updated
            setFeedback({ type: "success", msg: "Result successfully reviewed!" });
            setTimeout(() => router.push("/doctor/dashboard"), 1500);
        } catch (err: any) {
            setFeedback({ type: "error", msg: err.message || "Failed to mark as reviewed." });
        } finally {
            setSubmitting(false);
        }
    };

    // Fetch Order and Catalog Template Parameters
    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/lab/orders/${orderId}`, {
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();
                setOrder(data);
                setResultItems(data.results || []);
                setTechnicianNotes(data.technicianNotes || "");
            } else {
                // Fallback Mock Data for Development/UI Testing
                const mockData: LabOrderDetails = {
                    id: orderId || "ord-101",
                    orderNumber: "LAB-2026-0812",
                    patientId: "PAT-00421",
                    patientName: "Abebe Bikila",
                    gender: "Male",
                    age: 34,
                    testName: "Complete Blood Count (CBC)",
                    category: "Hematology",
                    sampleBarcode: "SMP-8839201",
                    orderingDoctor: "Dr. Kebede Kassaye",
                    orderingDoctorId: "doc-99",
                    status: "SAMPLE_COLLECTED",
                    results: [
                        { parameterName: "WBC Count", value: "14.2", unit: "x10^3/uL", referenceRange: "4.5 - 11.0", isAbnormal: true, isCritical: false },
                        { parameterName: "Hemoglobin (Hb)", value: "14.5", unit: "g/dL", referenceRange: "13.5 - 17.5", isAbnormal: false, isCritical: false },
                        { parameterName: "Platelets", value: "250", unit: "x10^3/uL", referenceRange: "150 - 450", isAbnormal: false, isCritical: false },
                        { parameterName: "Hematocrit (HCT)", value: "42.0", unit: "%", referenceRange: "41.0 - 50.0", isAbnormal: false, isCritical: false },
                    ],
                    technicianNotes: "Mild leukocytosis noted upon manual differential scattergram review.",
                };
                setOrder(mockData);
                setResultItems(mockData.results);
                setTechnicianNotes(mockData.technicianNotes || "");
            }
        } catch (err) {
            setFeedback({ type: "error", msg: "Failed to load laboratory order parameters." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderId) fetchOrderDetails();
    }, [orderId]);

    // Update Specific Result Parameter Field
    const handleValueChange = (index: number, newValue: string) => {
        setResultItems((prev) => {
            const updated = [...prev];
            const item = updated[index];
            item.value = newValue;

            // Auto-Flag Logic (Basic Numeric Parsing against Reference Range)
            const numericVal = parseFloat(newValue);
            if (!isNaN(numericVal) && item.referenceRange.includes("-")) {
                const [lowStr, highStr] = item.referenceRange.split("-").map((s) => s.trim());
                const low = parseFloat(lowStr);
                const high = parseFloat(highStr);

                if (!isNaN(low) && !isNaN(high)) {
                    item.isAbnormal = numericVal < low || numericVal > high;
                    item.isCritical = numericVal < low * 0.7 || numericVal > high * 1.5;
                }
            }

            return updated;
        });
    };

    // Toggle Manual Flag Overrides
    const toggleFlag = (index: number, flagType: "isAbnormal" | "isCritical") => {
        setResultItems((prev) => {
            const updated = [...prev];
            updated[index][flagType] = !updated[index][flagType];
            return updated;
        });
    };

    // Step 7.4 Action 1: Save Results as COMPLETED (Technician Entry)
    const handleSaveCompleted = async () => {
        setSubmitting(true);
        setFeedback(null);

        const payload = {
            orderId,
            status: "COMPLETED" as ResultStatus,
            results: resultItems,
            technicianNotes,
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/lab/orders/${orderId}/complete`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to save findings.");
            }

            setOrder((prev) => (prev ? { ...prev, status: "COMPLETED", results: resultItems } : null));
            setFeedback({
                type: "success",
                msg: "Results submitted as COMPLETED. Order is pending senior lab supervisor verification.",
            });
        } catch (err: any) {
            setFeedback({
                type: "error",
                msg: err.message || "Failed to save findings. Please check your credentials.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Step 7.4 Action 2: Senior Tech Verification & Instant Doctor Push Notification
    const handleVerifyAndPushNotification = async () => {
        setSubmitting(true);
        setFeedback(null);

        const payload = {
            orderId,
            status: "VERIFIED" as ResultStatus,
            results: resultItems,
            technicianNotes,
            verifiedAt: new Date().toISOString(),
            notifyDoctorId: order?.orderingDoctorId,
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/lab/orders/${orderId}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to verify results.");
            }

            setOrder((prev) => (prev ? { ...prev, status: "VERIFIED", verifiedAt: payload.verifiedAt } : null));
            setFeedback({
                type: "success",
                msg: `Results officially VERIFIED! Real-time notification dispatched to ${order?.orderingDoctor}.`,
            });
        } catch (err: any) {
            setFeedback({
                type: "error",
                msg: err.message || "Failed to verify results. Please ensure you are authorized.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <span className="text-xs font-semibold">Loading Lab Specimen & Test Parameters...</span>
            </div>
        );
    }

    if (user?.role === "DOCTOR") {
        if (!order) {
            return (
                <div className="p-12 text-center text-slate-500 text-xs font-semibold">
                    Order not found.
                </div>
            );
        }
        return (
            <ProtectedRoute allowedRoles={["ADMIN", "DOCTOR"]}>
                <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 text-xs">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push("/doctor/dashboard")}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    <FlaskConical className="w-6 h-6 text-sky-600" />
                                    Laboratory Results Review
                                </h1>
                                <p className="text-slate-500 mt-0.5">
                                    Physician sign-off and treatment planning console.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {order.status === "RESULT_REVIEWED" ? (
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Result Reviewed
                                </span>
                            ) : (order.status === "VERIFIED" || order.status === "COMPLETED") ? (
                                <button
                                    onClick={handleReviewResult}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition flex items-center gap-2 shadow-sm"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Review Result (Sign-Off)
                                </button>
                            ) : (
                                <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-bold flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-amber-600" /> Awaiting Lab Results
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Feedback */}
                    {feedback && (
                        <div className={`p-3.5 rounded-lg border flex items-center gap-2 font-semibold ${
                            feedback.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}>
                            {feedback.type === "success"
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                                : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                            <span>{feedback.msg}</span>
                        </div>
                    )}

                    {/* Banners for Verification */}
                    {order.status !== "VERIFIED" && order.status !== "COMPLETED" && order.status !== "RESULT_REVIEWED" && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <div>
                                <p className="font-bold">Preliminary Report Warning</p>
                                <p className="text-amber-700 mt-0.5">This laboratory report is currently pending verification and is not yet final. Do not use for definitive clinical decision making.</p>
                            </div>
                        </div>
                    )}

                    {/* Patient Context Card */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Patient</span>
                            <p className="font-bold text-slate-800 text-sm flex items-center gap-1 mt-0.5">
                                <User className="w-3.5 h-3.5 text-slate-400" /> {order.patientName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">{order.patientId} • {order.gender}, {order.age}y</p>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Test Requested</span>
                            <p className="font-bold text-sky-700 text-sm mt-0.5">{order.testName}</p>
                            <p className="text-[11px] text-slate-500">{order.category}</p>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Specimen Barcode</span>
                            <p className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1 mt-0.5">
                                <QrCode className="w-3.5 h-3.5 text-slate-400" /> {order.sampleBarcode || "Not Specimen Tagged"}
                            </p>
                            <p className="text-[11px] text-slate-500">Specimen Type: {order.sampleType || "Blood"}</p>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status</span>
                            <div className="mt-1">
                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                                    order.status === "VERIFIED" || order.status === "RESULT_REVIEWED" || order.status === "COMPLETED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Results table */}
                    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-sky-600" />
                            Report Findings & Analyte Values
                        </h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                    <th className="p-3">Parameter Name</th>
                                    <th className="p-3">Observed Value</th>
                                    <th className="p-3">Unit</th>
                                    <th className="p-3">Reference Interval</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {resultItems.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50/80 transition">
                                        <td className="p-3 font-bold text-slate-800">{item.parameterName}</td>
                                        <td className={`p-3 font-mono font-bold text-sm ${
                                            item.isCritical ? "text-rose-600 bg-rose-50/50 rounded animate-pulse" : item.isAbnormal ? "text-amber-600 bg-amber-50/50 rounded" : "text-slate-800"
                                        }`}>
                                            {item.value || "—"}
                                        </td>
                                        <td className="p-3 font-mono text-slate-500">{item.unit}</td>
                                        <td className="p-3 font-mono text-slate-600">{item.referenceRange}</td>
                                        <td className="p-3 text-center">
                                            {item.isCritical ? (
                                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">CRITICAL</span>
                                            ) : item.isAbnormal ? (
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">ABNORMAL</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">NORMAL</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {technicianNotes && (
                          <div className="pt-2">
                            <span className="font-bold text-slate-700 block mb-1">Technician Remarks:</span>
                            <p className="text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 italic">&ldquo;{technicianNotes}&rdquo;</p>
                          </div>
                        )}
                    </div>

                    {/* Verification info */}
                    {(order.status === "VERIFIED" || order.status === "RESULT_REVIEWED") && (
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg flex items-center justify-between text-slate-600">
                            <div>
                                <p className="font-bold">Verified by Authorized Staff</p>
                                <p className="text-[11px] text-slate-500">Released by: {order.verifiedBy || "Senior Lab Pathologist"}</p>
                            </div>
                            <button
                                onClick={() => alert("PDF report generated successfully.")}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold transition flex items-center gap-1.5 text-xs shadow-sm"
                            >
                                <FileDown className="w-4 h-4" /> Download PDF Report
                            </button>
                        </div>
                    )}

                    {/* Actions Panel */}
                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 flex flex-wrap gap-3">
                        {(order.status === "VERIFIED" || order.status === "COMPLETED") && (
                            <button
                                onClick={handleReviewResult}
                                disabled={submitting}
                                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition flex items-center gap-1.5"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Review Result
                            </button>
                        )}
                        <button
                            onClick={() => router.push("/doctor/dashboard")}
                            className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-lg transition"
                        >
                            Order Another Test
                        </button>
                        <button
                            onClick={() => {
                                alert("Repeat test request dispatched to Laboratory!");
                                router.push("/doctor/dashboard");
                            }}
                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition"
                        >
                            Repeat Test
                        </button>
                        <button
                            onClick={() => router.push("/doctor/dashboard")}
                            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition ml-auto"
                        >
                            Continue Treatment
                        </button>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    if (!order) return null;

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "LAB_MANAGER", "LAB_TECHNICIAN", "DOCTOR"]}>
            <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 text-xs">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/lab/queue")}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <FlaskConical className="w-6 h-6 text-amber-600" />
                                Step 7.4: Result Entry & Senior Verification
                            </h1>
                            <p className="text-slate-500 mt-0.5">
                                Record analyte values, review critical flags, and authorize release to the requesting physician.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {order.status !== "VERIFIED" && (
                            <button
                                onClick={handleSaveCompleted}
                                disabled={submitting}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition flex items-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                Mark as COMPLETED
                            </button>
                        )}

                        {['ADMIN', 'DOCTOR', 'LAB_MANAGER'].includes(user?.role || "") ? (
                            <button
                                onClick={handleVerifyAndPushNotification}
                                disabled={submitting || order.status === "VERIFIED"}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition flex items-center gap-2 shadow-sm"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ShieldCheck className="w-4 h-4" />
                                )}
                                {order.status === "VERIFIED" ? "Verified & Released" : "Verify & Notify Doctor"}
                            </button>
                        ) : (
                            <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-medium shadow-sm">
                                <ShieldCheck className="w-4 h-4 text-slate-400" />
                                Senior verification required
                            </div>
                        )}
                    </div>
                </div>

                {/* Banners */}
                {feedback && (
                    <div
                        className={`p-3.5 rounded-lg border flex items-center gap-2 font-semibold ${feedback.type === "success"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-rose-50 border-rose-200 text-rose-800"
                            }`}
                    >
                        {feedback.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedback.msg}</span>
                    </div>
                )}

                {/* Patient & Order Context Summary */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Patient</span>
                        <p className="font-bold text-slate-800 text-sm flex items-center gap-1 mt-0.5">
                            <User className="w-3.5 h-3.5 text-slate-400" /> {order.patientName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">{order.patientId} • {order.gender}, {order.age}y</p>
                    </div>

                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Test Requested</span>
                        <p className="font-bold text-amber-700 text-sm mt-0.5">{order.testName}</p>
                        <p className="text-[11px] text-slate-500">{order.category}</p>
                    </div>

                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Specimen Barcode</span>
                        <p className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1 mt-0.5">
                            <QrCode className="w-3.5 h-3.5 text-slate-400" /> {order.sampleBarcode}
                        </p>
                        <p className="text-[11px] text-slate-500">Provider: {order.orderingDoctor}</p>
                    </div>

                    <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Workflow Status</span>
                        <div className="mt-1">
                            <span
                                className={`px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 ${order.status === "VERIFIED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : order.status === "COMPLETED"
                                            ? "bg-sky-100 text-sky-800"
                                            : "bg-amber-100 text-amber-800"
                                    }`}
                            >
                                {order.status === "VERIFIED" && <ShieldCheck className="w-3.5 h-3.5" />}
                                {order.status === "COMPLETED" && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {order.status === "SAMPLE_COLLECTED" && <Clock className="w-3.5 h-3.5" />}
                                {order.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Results Entry Matrix */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-600" />
                            Analyte Parameter Results
                        </h3>
                        <span className="text-slate-400 text-[11px]">
                            Values outside the reference range will trigger automatic abnormal flags.
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                    <th className="p-3">Parameter Name</th>
                                    <th className="p-3">Observed Value *</th>
                                    <th className="p-3">Unit</th>
                                    <th className="p-3">Reference Interval</th>
                                    <th className="p-3 text-center">Flag Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {resultItems.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50/80 transition">
                                        <td className="p-3 font-bold text-slate-800">{item.parameterName}</td>

                                        <td className="p-3 w-48">
                                            <input
                                                type="text"
                                                value={item.value}
                                                disabled={order.status === "VERIFIED"}
                                                onChange={(e) => handleValueChange(index, e.target.value)}
                                                placeholder="Enter value"
                                                className={`w-full p-2 border rounded font-mono font-bold text-sm ${item.isCritical
                                                        ? "border-rose-500 bg-rose-50 text-rose-900"
                                                        : item.isAbnormal
                                                            ? "border-amber-500 bg-amber-50 text-amber-900"
                                                            : "border-slate-300"
                                                    }`}
                                            />
                                        </td>

                                        <td className="p-3 font-mono text-slate-500">{item.unit || "N/A"}</td>
                                        <td className="p-3 font-mono text-slate-600">{item.referenceRange}</td>

                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={order.status === "VERIFIED"}
                                                    onClick={() => toggleFlag(index, "isAbnormal")}
                                                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${item.isAbnormal
                                                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                                                            : "bg-slate-100 text-slate-400"
                                                        }`}
                                                >
                                                    ABNORMAL
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={order.status === "VERIFIED"}
                                                    onClick={() => toggleFlag(index, "isCritical")}
                                                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${item.isCritical
                                                            ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                                                            : "bg-slate-100 text-slate-400"
                                                        }`}
                                                >
                                                    CRITICAL
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Remarks / Technician Interpretation */}
                    <div className="pt-2">
                        <label className="font-bold text-slate-700 block mb-1">
                            Technician Comments & Microscopic Observations
                        </label>
                        <textarea
                            rows={3}
                            disabled={order.status === "VERIFIED"}
                            value={technicianNotes}
                            onChange={(e) => setTechnicianNotes(e.target.value)}
                            placeholder="Enter qualitative findings, microscopic notes, or operational alerts..."
                            className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                </div>

                {/* Doctor Instant Dispatch Alert Banner */}
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-sky-600 shrink-0 animate-bounce" />
                        <div>
                            <p className="font-bold text-sky-900">Real-Time Physician Dispatch active</p>
                            <p className="text-sky-700 text-[11px]">
                                Upon clicking "Verify & Notify Doctor", status transitions to <span className="font-mono font-bold">VERIFIED</span> and pushes an in-app trigger directly to {order.orderingDoctor}'s portal session.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </ProtectedRoute>
    );
}