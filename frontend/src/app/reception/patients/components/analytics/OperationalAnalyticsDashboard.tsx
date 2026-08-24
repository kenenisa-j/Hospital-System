"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Bed,
    AlertTriangle,
    CalendarX,
    Package,
    Building2,
    Download,
    Loader2,
    AlertCircle
} from "lucide-react";

interface WardOccupancy {
    wardId: string;
    wardName: string;
    totalBeds: number;
    occupiedBeds: number;
    occupancyRate: number;
}

interface ExpiringItem {
    batchId: string;
    batchNumber: string;
    itemName: string;
    unit: string;
    remainingQuantity: string | number;
    expiryDate: string;
    isExpired: boolean;
}

interface LowStockItem {
    inventoryId: string;
    itemName: string;
    category: string;
    currentStock: string | number;
    minReorderLevel: string | number;
    shortage: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function OperationalAnalyticsDashboard() {
    const [wards, setWards] = useState<WardOccupancy[]>([]);
    const [expiring, setExpiring] = useState<ExpiringItem[]>([]);
    const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOperationalData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/analytics/operational`, {
                credentials: "include"
            });
            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }
            const data = await res.json();
            setWards(data.bedOccupancy || []);
            setExpiring(data.expiringBatches || []);
            setLowStock(data.lowStock || []);
        } catch (err: any) {
            console.error("Failed to load operational analytics:", err);
            setError(err.message || "Failed to load operational reports");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOperationalData();
    }, [fetchOperationalData]);

    const totalBeds = wards.reduce((acc, w) => acc + Number(w.totalBeds || 0), 0);
    const totalOccupied = wards.reduce((acc, w) => acc + Number(w.occupiedBeds || 0), 0);
    const overallOccupancy = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

    const getBatchStatus = (item: ExpiringItem) => {
        if (item.isExpired) return "EXPIRED";
        const expDate = new Date(item.expiryDate);
        const diffTime = expDate.getTime() - Date.now();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) return "CRITICAL";
        return "WARNING";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-sm text-slate-500 font-semibold">Loading operational data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-2" />
                <h2 className="text-lg font-bold text-slate-800">Operational Reports Unavailable</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-md">{error}</p>
                <button
                    onClick={fetchOperationalData}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                    Retry Loading Reports
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-800 space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-indigo-600" /> Operational & Inventory Reports
                    </h1>
                    <p className="text-xs text-slate-500">Real-time bed utilization, expiring stock audit, and reorder warnings.</p>
                </div>

                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition">
                    <Download className="w-4 h-4" /> Export Operational Audit
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Overall Bed Occupancy</span>
                        <span className="text-2xl font-black text-slate-800">{overallOccupancy}%</span>
                        <span className="text-[11px] font-bold text-indigo-600 mt-1 block">
                            {totalOccupied} / {totalBeds} Beds Occupied
                        </span>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Bed className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Low Stock Alerts</span>
                        <span className="text-2xl font-black text-amber-600">{lowStock.length} Items</span>
                        <span className="text-[11px] font-bold text-slate-500 mt-1 block">Below Minimum Threshold</span>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Expiring Batches (90D)</span>
                        <span className="text-2xl font-black text-rose-600">{expiring.length} Batches</span>
                        <span className="text-[11px] font-bold text-rose-600 mt-1 block">Action Required</span>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                        <CalendarX className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Ward Occupancy Rates */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Bed className="w-4 h-4 text-indigo-600" /> Ward Bed Occupancy Breakdown
                    </h2>
                    <span className="text-xs text-slate-400 font-semibold">{totalBeds} Total Capacity</span>
                </div>

                {wards.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">No wards or bed layout configured.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {wards.map((ward) => (
                            <div key={ward.wardId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs text-slate-800">{ward.wardName}</span>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${Number(ward.occupancyRate || 0) >= 85 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                                        {ward.occupancyRate}%
                                    </span>
                                </div>

                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${Number(ward.occupancyRate || 0) >= 85 ? "bg-rose-500" : "bg-indigo-600"}`}
                                        style={{ width: `${ward.occupancyRate}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                                    <span>Occupied: <strong>{ward.occupiedBeds}</strong></span>
                                    <span>Available: <strong>{ward.totalBeds - ward.occupiedBeds}</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Grid: Low Stock Warnings & Expiring Batches */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Low Stock Alerts */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-600" /> Low Stock Warning List
                        </h2>
                        <span className="text-xs text-slate-400 font-semibold">Reorder Thresholds</span>
                    </div>

                    {lowStock.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">All inventory items are above minimum stock levels.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {lowStock.map((item, idx) => (
                                <div key={idx} className="py-3 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-bold text-slate-800 block">{item.itemName}</span>
                                        <span className="text-slate-400 text-[10px]">{item.category}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-extrabold text-amber-600 block">{item.currentStock} left</span>
                                        <span className="text-[10px] text-slate-400">Min: {item.minReorderLevel}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Expiring Medicine Batches */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <CalendarX className="w-4 h-4 text-rose-600" /> Expiring Drug Batches
                        </h2>
                        <span className="text-xs text-slate-400 font-semibold">Near Expiry</span>
                    </div>

                    {expiring.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">No batches expiring within 90 days.</div>
                    ) : (
                        <div className="space-y-2.5">
                            {expiring.map((batch) => {
                                const status = getBatchStatus(batch);
                                return (
                                    <div key={batch.batchId} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800">{batch.itemName}</span>
                                                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">#{batch.batchNumber}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Qty: {batch.remainingQuantity} {batch.unit} • Expiry: {new Date(batch.expiryDate).toLocaleDateString()}</span>
                                        </div>

                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${status === "EXPIRED"
                                                ? "bg-rose-600 text-white"
                                                : status === "CRITICAL"
                                                    ? "bg-rose-100 text-rose-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}>
                                            {status}
                                        </span>
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