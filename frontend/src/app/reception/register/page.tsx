'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface FormData {
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber: string;
    address: string;
    bloodGroup: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
}

const INITIAL: FormData = {
    fullName: '', dateOfBirth: '', gender: '', phoneNumber: '',
    address: '', bloodGroup: '', emergencyContactName: '', emergencyContactPhone: '',
    emergencyContactRelation: '',
};

export default function ReceptionRegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState<FormData>(INITIAL);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{ id: string; mrn: string; name: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.fullName || !form.dateOfBirth || !form.gender || !form.phoneNumber) {
            setError('Full name, date of birth, gender, and phone number are required.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            });
            if (res.status === 401 || res.status === 403) {
                setError('Your session has expired or you do not have permission. Please log out and log in again.');
                return;
            }
            if (!res.ok) {
                const err = await res.json();
                throw new Error(getErrorMessage(err.error, `Server error ${res.status}`));
            }
            const data = await res.json();
            setCreated({ id: data.patient.id, mrn: data.patient.mrn, name: data.patient.fullName });
        } catch (err: any) {
            setError(err.message || 'Failed to register patient.');
        } finally {
            setSubmitting(false);
        }
    };

    if (created) {
        return (
            <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-xl border border-emerald-200 shadow-lg p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Patient Registered</h2>
                        <p className="text-slate-600"><span className="font-semibold">{created.name}</span> has been registered.</p>
                        <p className="font-mono text-sky-700 font-bold text-lg bg-sky-50 border border-sky-200 rounded-lg px-4 py-2 inline-block">MRN: {created.mrn}</p>
                        <div className="flex justify-center gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => { setCreated(null); setForm(INITIAL); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition">
                                Register Another
                            </button>
                            <button onClick={() => router.push(`/reception/visits/new?patientId=${created.id}`)} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg transition">
                                Issue Visit Ticket →
                            </button>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <PlusCircle className="w-6 h-6 text-sky-600" />
                            New Patient Walk-In
                        </h1>
                        <p className="text-sm text-slate-500">Register a new patient into the hospital system.</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-800 text-sm">
                        <div className="flex items-center gap-2"><XCircle className="w-5 h-5 shrink-0" />{error}</div>
                        <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                    <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide border-b border-slate-100 pb-3">Patient Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { name: 'fullName', label: 'Full Name *', type: 'text', placeholder: 'e.g. Abebe Girma' },
                            { name: 'dateOfBirth', label: 'Date of Birth *', type: 'date', placeholder: '' },
                        ].map(f => (
                            <div key={f.name} className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase">{f.label}</label>
                                <input
                                    type={f.type} name={f.name}
                                    value={(form as any)[f.name]}
                                    onChange={handleChange}
                                    placeholder={f.placeholder}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                        ))}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase">Gender *</label>
                            <select name="gender" value={form.gender} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                                <option value="">Select gender</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase">Phone Number *</label>
                            <input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="+251..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-600 uppercase">Address</label>
                            <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Kebele, Woreda, City" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase">Blood Group</label>
                            <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                                <option value="UNKNOWN">Unknown</option>
                                {[['A_POSITIVE','A+'],['A_NEGATIVE','A-'],['B_POSITIVE','B+'],['B_NEGATIVE','B-'],['AB_POSITIVE','AB+'],['AB_NEGATIVE','AB-'],['O_POSITIVE','O+'],['O_NEGATIVE','O-']].map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-600 uppercase">Emergency Contact Name</label>
                            <input type="text" name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} placeholder="Contact person name" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase">Emergency Contact Phone</label>
                            <input type="tel" name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={handleChange} placeholder="+251..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase">Emergency Contact Relation</label>
                            <select name="emergencyContactRelation" value={form.emergencyContactRelation} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                                <option value="">Select relation</option>
                                {['Spouse','Parent','Child','Sibling','Relative','Friend','Guardian','Other'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm transition flex items-center justify-center gap-2"
                    >
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering Patient...</> : 'Register Patient & Assign MRN'}
                    </button>
                </form>
            </div>
        </ProtectedRoute>
    );
}
