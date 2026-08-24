'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search, UserCheck, Phone, CreditCard, Calendar, RefreshCw, ArrowRight } from 'lucide-react';

interface Patient {
    id: string;
    mrn: string;
    fullName: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    phoneNumber: string;
    address: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    bloodGroup?: string;
    createdAt: string;
}

interface Props {
    onSelectPatient?: (patient: Patient) => void;
    onSendToTriage?: (patient: Patient) => void;
}

export default function PatientSearchEngine({ onSelectPatient, onSendToTriage }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Fetch / Search API handler with debouncing logic
    const fetchPatients = async (query: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setPatients(data.patients || []);
            }
        } catch (err) {
            console.error('Failed to search patients:', err);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchPatients('');
    }, []);

    // Debounced search on term change
    useEffect(() => {
        const timer = setTimeout(() => {
            startTransition(() => {
                fetchPatients(searchTerm);
            });
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            {/* Search Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Search className="w-5 h-5 text-indigo-600" />
                        Patient Lookup &amp; Master Index
                    </h2>
                    <p className="text-sm text-slate-500">
                        Search existing records instantly by MRN (e.g. ABAY-PT-2026-00001), Full Name, or Phone.
                    </p>
                </div>
                <button
                    onClick={() => fetchPatients(searchTerm)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Index
                </button>
            </div>

            {/* Input Field */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Type MRN ID, Name, or Phone number..."
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-slate-800 placeholder-slate-400 font-medium text-base"
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Results Count & Loader indicator */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                <span>
                    Showing {patients.length} patient record{patients.length !== 1 ? 's' : ''}
                </span>
                {(loading || isPending) && (
                    <span className="text-indigo-600 animate-pulse">Searching database...</span>
                )}
            </div>

            {/* Patient Cards / Table List */}
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                {patients.length === 0 && !loading ? (
                    <div className="py-12 text-center text-slate-400">
                        <UserCheck className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-300" />
                        <p className="font-medium">No patient matching &quot;{searchTerm}&quot; found.</p>
                        <p className="text-xs text-slate-400 mt-1">Check spelling or register a new patient on the left.</p>
                    </div>
                ) : (
                    patients.map((patient) => (
                        <div
                            key={patient.id}
                            className="py-4 hover:bg-slate-50/80 px-3 rounded-lg transition flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                        >
                            {/* Left Details */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition">
                                        {patient.fullName}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        <CreditCard className="w-3 h-3 mr-1" />
                                        {patient.mrn}
                                    </span>
                                    {patient.bloodGroup && patient.bloodGroup !== 'UNKNOWN' && (
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                                            {patient.bloodGroup.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        {patient.phoneNumber}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}
                                    </span>
                                    <span>Gender: <strong className="capitalize text-slate-700">{patient.gender.toLowerCase()}</strong></span>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-2 self-start md:self-center">
                                {onSendToTriage && (
                                    <button
                                        onClick={() => onSendToTriage(patient)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition inline-flex items-center gap-1.5 shadow-sm"
                                    >
                                        Send to Triage
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {onSelectPatient && (
                                    <button
                                        onClick={() => onSelectPatient(patient)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                                    >
                                        View File
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}