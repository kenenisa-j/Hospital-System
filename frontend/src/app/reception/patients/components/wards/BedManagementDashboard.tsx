"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    BedDouble, AlertTriangle, Sparkles, ShieldCheck,
    User, LayoutGrid, CheckCircle2, Loader2, AlertCircle, RefreshCw
} from "lucide-react";

type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE';

interface Bed {
    id: string;
    wardId: string;
    bedNumber: string;
    status: BedStatus;
}

interface Room {
    id: string;
    wardId: string;
    beds: Bed[];
}

interface Ward {
    id: string;
    name: string;
    rooms: Room[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STATUS_CONFIG: Record<BedStatus, { color: string; text: string; bg: string; icon: React.ReactNode }> = {
    AVAILABLE: { color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle2 className="w-4 h-4" /> },
    OCCUPIED: { color: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50", icon: <User className="w-4 h-4" /> },
    RESERVED: { color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", icon: <ShieldCheck className="w-4 h-4" /> },
    CLEANING: { color: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50", icon: <Sparkles className="w-4 h-4" /> },
    MAINTENANCE: { color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", icon: <AlertTriangle className="w-4 h-4" /> },
};

export default function BedManagementDashboard() {
    const [wards, setWards] = useState<Ward[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("ALL");
    const [updatingBedId, setUpdatingBedId] = useState<string | null>(null);

    const fetchWards = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards`, { credentials: "include" });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setWards(data.wards || []);
        } catch (err: any) {
            setError(err.message || "Failed to load bed layout.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWards(); }, [fetchWards]);

    const updateBedStatus = async (bedId: string, newStatus: BedStatus) => {
        setUpdatingBedId(bedId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wards/beds/${bedId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                // Optimistically update local state
                setWards(prev => prev.map(w => ({
                    ...w,
                    rooms: w.rooms.map(r => ({
                        ...r,
                        beds: r.beds.map(b => b.id === bedId ? { ...b, status: newStatus } : b)
                    }))
                })));
            }
        } catch (err) {
            console.error("Failed to update bed status:", err);
        } finally {
            setUpdatingBedId(null);
        }
    };

    // Flatten all beds from all wards
    const allBeds = wards.flatMap(w => w.rooms.flatMap(r => r.beds));
    const filteredBeds = (beds: Bed[]) => filter === "ALL" ? beds : beds.filter(b => b.status === filter);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-sm text-slate-500 font-semibold">Loading bed layout...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
                <p className="font-bold text-slate-700">Failed to Load Bed Layout</p>
                <p className="text-sm text-slate-400 mt-1">{error}</p>
                <button onClick={fetchWards} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">Retry</button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-800">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Bed Management Dashboard</h1>
                    <p className="text-sm text-slate-500">Real-time floor occupancy and maintenance tracking. {allBeds.length} beds total.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchWards} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-500">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {(["ALL", "AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"] as const).map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === f ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {wards.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400">
                    <BedDouble className="w-12 h-12 text-slate-200 mb-3" />
                    <p className="font-bold text-slate-600">No Wards Configured</p>
                    <p className="text-xs mt-1">Ask your administrator to create wards, rooms, and beds.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {wards.map((ward) => {
                        const wardBeds = ward.rooms.flatMap(r => r.beds);
                        const displayed = filteredBeds(wardBeds);
                        if (displayed.length === 0) return null;
                        return (
                            <div key={ward.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <LayoutGrid className="w-5 h-5 text-indigo-600" /> {ward.name}
                                    <span className="text-xs font-semibold text-slate-400 ml-auto">
                                        {wardBeds.filter(b => b.status === 'AVAILABLE').length} available / {wardBeds.length} total
                                    </span>
                                </h2>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {displayed.map((bed) => {
                                        const config = STATUS_CONFIG[bed.status];
                                        const isUpdating = updatingBedId === bed.id;
                                        return (
                                            <div key={bed.id}
                                                className={`p-4 rounded-xl border ${config.bg} border-slate-200 shadow-sm flex flex-col gap-3 transition hover:shadow-md ${isUpdating ? 'opacity-60' : ''}`}>
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-800 text-sm">{bed.bedNumber}</span>
                                                    <div className={`${config.color} p-1.5 rounded text-white`}>
                                                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : config.icon}
                                                    </div>
                                                </div>
                                                <div className={`text-[10px] font-bold uppercase ${config.text}`}>{bed.status}</div>

                                                <select
                                                    disabled={isUpdating}
                                                    className="text-[10px] bg-white border border-slate-200 rounded px-1 py-1 w-full mt-1 cursor-pointer disabled:opacity-50"
                                                    value={bed.status}
                                                    onChange={(e) => updateBedStatus(bed.id, e.target.value as BedStatus)}
                                                >
                                                    <option value="AVAILABLE">Available</option>
                                                    <option value="OCCUPIED">Occupied</option>
                                                    <option value="RESERVED">Reserved</option>
                                                    <option value="CLEANING">Cleaning</option>
                                                    <option value="MAINTENANCE">Maintenance</option>
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}