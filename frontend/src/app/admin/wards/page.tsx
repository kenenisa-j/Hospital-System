"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Bed, Plus, Layers, DoorClosed } from "lucide-react";

interface BedItem {
    id: string;
    bedNumber: string;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
}

interface RoomItem {
    id: string;
    roomNumber: string;
    roomType: string;
    capacity: number;
    beds: BedItem[];
}

interface WardItem {
    id: string;
    name: string;
    code: string;
    floor: number;
    rooms: RoomItem[];
}

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}`;

export default function WardConfigPage() {
    const [wards, setWards] = useState<WardItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Quick creation states
    const [wardName, setWardName] = useState("");
    const [wardCode, setWardCode] = useState("");
    const [wardFloor, setWardFloor] = useState(1);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

    const fetchWards = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/wards`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setWards(data.wards || []);
            }
        } catch (err) {
            console.error("Failed to load wards hierarchy", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWards();
    }, []);

    return (
        <ProtectedRoute allowedRoles={["ADMIN"]}>
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Layers className="w-6 h-6 text-sky-600" />
                            Ward, Room & Bed Setup
                        </h1>
                        <p className="text-sm text-slate-500">
                            Configure physical bed allocation hierarchy for inpatient and emergency care.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Ward Add */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-fit">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-sky-600" /> Add New Ward
                        </h2>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const res = await fetch(`${API_BASE}/api/wards`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({
                                        departmentId: selectedDepartmentId,
                                        name: wardName,
                                        code: wardCode,
                                        floor: Number(wardFloor),
                                    }),
                                });
                                if (res.ok) {
                                    setWardName("");
                                    setWardCode("");
                                    fetchWards();
                                }
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Ward Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. ICU Ward 1"
                                    value={wardName}
                                    onChange={(e) => setWardName(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Ward Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. ICU-01"
                                    value={wardCode}
                                    onChange={(e) => setWardCode(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase">
                                    Floor Number
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={wardFloor}
                                    onChange={(e) => setWardFloor(Number(e.target.value))}
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-sky-500"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md text-sm transition"
                            >
                                Create Ward
                            </button>
                        </form>
                    </div>

                    {/* Structured Visualization Tree */}
                    <div className="lg:col-span-2 space-y-4">
                        {wards.map((ward) => (
                            <div
                                key={ward.id}
                                className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3"
                            >
                                <div className="flex justify-between items-center border-b pb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-base">
                                            {ward.name} <span className="text-xs text-slate-400 font-mono">({ward.code})</span>
                                        </h3>
                                        <p className="text-xs text-slate-500">Floor: {ward.floor}</p>
                                    </div>
                                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded">
                                        {ward.rooms.length} Rooms
                                    </span>
                                </div>

                                {/* Rooms Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                    {ward.rooms.map((room) => (
                                        <div
                                            key={room.id}
                                            className="p-3 bg-slate-50 border rounded-md space-y-2"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-700">
                                                    <DoorClosed className="w-4 h-4 text-slate-500" />
                                                    Room {room.roomNumber}
                                                </div>
                                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                                                    {room.roomType}
                                                </span>
                                            </div>

                                            {/* Beds Map */}
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {room.beds.map((b) => (
                                                    <div
                                                        key={b.id}
                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold ${b.status === "AVAILABLE"
                                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                                                : b.status === "OCCUPIED"
                                                                    ? "bg-red-100 text-red-800 border border-red-300"
                                                                    : "bg-amber-100 text-amber-800 border border-amber-300"
                                                            }`}
                                                    >
                                                        <Bed className="w-3 h-3" />
                                                        {b.bedNumber}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}