"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    BarChart3,
    Users,
    Activity,
    Building2,
    TrendingUp,
    FileSpreadsheet,
    Loader2,
    AlertCircle
} from "lucide-react";

interface VolumeTrend {
    date: string;
    totalPatients: number;
}

interface TopDiagnosis {
    diagnosis: string;
    totalCases: number;
}

interface DeptData {
    departmentName: string;
    patientCount: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ClinicalAnalyticsDashboard() {
    const [timeframe, setTimeframe] = useState<"7D" | "30D" | "1Y">("30D");
    const [volumeTrends, setVolumeTrends] = useState<VolumeTrend[]>([]);
    const [topDiagnoses, setTopDiagnoses] = useState<TopDiagnosis[]>([]);
    const [deptBreakdown, setDeptBreakdown] = useState<DeptData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchClinicalData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/clinical`, {
                credentials: "include"
            });
            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }
            const data = await res.json();
            setVolumeTrends(data.volumeTrends || []);
            setTopDiagnoses(data.topDiagnoses || []);
            setDeptBreakdown(data.deptBreakdown || []);
        } catch (err: any) {
            console.error("Failed to load clinical analytics:", err);
            setError(err.message || "Failed to load clinical reports");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClinicalData();
    }, [fetchClinicalData]);

    const totalVisits = volumeTrends.reduce((acc, curr) => acc + Number(curr.totalPatients || 0), 0);
    const dailyAvg = volumeTrends.length > 0 ? (totalVisits / volumeTrends.length).toFixed(1) : "0";

    const totalDiagnosesCases = topDiagnoses.reduce((acc, curr) => acc + Number(curr.totalCases || 0), 0);
    const totalDeptPatients = deptBreakdown.reduce((acc, curr) => acc + Number(curr.patientCount || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-sm text-slate-500 font-semibold">Loading clinical analytics...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-2" />
                <h2 className="text-lg font-bold text-slate-800">Clinical Reports Unavailable</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-md">{error}</p>
                <button
                    onClick={fetchClinicalData}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                    Retry Loading Reports
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-indigo-600" /> Clinical Analytics & Volume Reports
                    </h1>
                    <p className="text-xs text-slate-500">Aggregated patient flow, diagnostic metrics, and department breakdowns.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
                        {(["7D", "30D", "1Y"] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeframe(range)}
                                className={`px-3 py-1.5 rounded-md transition ${timeframe === range ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <button className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition">
                        <FileSpreadsheet className="w-4 h-4" /> Export Report
                    </button>
                </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Volume (30D)</span>
                        <span className="text-2xl font-black text-slate-800">{totalVisits} Visits</span>
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                            <TrendingUp className="w-3.5 h-3.5" /> Live patient appointments
                        </span>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Daily Average Visits</span>
                        <span className="text-2xl font-black text-slate-800">{dailyAvg}</span>
                        <span className="text-[11px] font-bold text-slate-500 mt-1 block">Active polling trends</span>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Activity className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Active Departments</span>
                        <span className="text-2xl font-black text-slate-800">{deptBreakdown.length} Units</span>
                        <span className="text-[11px] font-bold text-indigo-600 mt-1 block">Real-time load share</span>
                    </div>
                    <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Top Diagnoses Table */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-800">Most Common Diagnoses</h2>
                        <span className="text-xs text-slate-400 font-semibold">Top Conditions</span>
                    </div>

                    {topDiagnoses.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">No diagnostic cases recorded yet.</div>
                    ) : (
                        <div className="space-y-3">
                            {topDiagnoses.map((item, index) => {
                                const percentage = totalDiagnosesCases > 0
                                    ? Math.round((item.totalCases / totalDiagnosesCases) * 100)
                                    : 0;
                                return (
                                    <div key={index} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold text-slate-700">
                                            <span>{item.diagnosis || "Undiagnosed / Consultation"}</span>
                                            <span className="text-slate-500">{item.totalCases} cases ({percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Department Volume Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-800">Department Workload Breakdown</h2>
                        <span className="text-xs text-slate-400 font-semibold">Patient Shares</span>
                    </div>

                    {deptBreakdown.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">No department data compiled yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {deptBreakdown.map((dept, idx) => {
                                const share = totalDeptPatients > 0
                                    ? Math.round((dept.patientCount / totalDeptPatients) * 100)
                                    : 0;
                                return (
                                    <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                            {dept.departmentName || "General Services / OPD"}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-slate-600 font-medium">{dept.patientCount} patients</span>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-[10px]">
                                                {share}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}