'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';

// Map each role to its default dashboard route
const ROLE_REDIRECTS: Record<string, string> = {
    ADMIN: '/admin/staff',
    RECEPTIONIST: '/reception/dashboard',
    DOCTOR: '/doctor/dashboard',
    NURSE: '/nurse',
    LAB_TECHNICIAN: '/lab',
    RADIOLOGIST: '/radiology',
    PHARMACIST: '/pharmacy',
    CASHIER: '/cashier',
};

interface DemoAccount {
    role: string;
    title: string;
    name: string;
    email: string;
    password: string;
    dept: string;
    icon: string;
    badgeColor: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
    {
        role: 'ADMIN',
        title: 'System Admin',
        name: 'Abebe Girma',
        email: 'admin@abay-hospital.et',
        password: 'Admin@1234',
        dept: 'Administration',
        icon: '🛡️',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
    },
    {
        role: 'RECEPTIONIST',
        title: 'Receptionist',
        name: 'Tigist Bekele',
        email: 'reception@abay-hospital.et',
        password: 'Staff@1234',
        dept: 'Reception & Triage',
        icon: '📋',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    },
    {
        role: 'DOCTOR',
        title: 'OPD Doctor',
        name: 'Dr. Yonas Tesfaye',
        email: 'doctor@abay-hospital.et',
        password: 'Staff@1234',
        dept: 'Outpatient Dept',
        icon: '🩺',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200',
    },
    {
        role: 'NURSE',
        title: 'Ward Nurse',
        name: 'Mekdes Haile',
        email: 'nurse@abay-hospital.et',
        password: 'Staff@1234',
        dept: 'General Ward',
        icon: '💉',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
    },
    {
        role: 'LAB_TECHNICIAN',
        title: 'Lab Tech',
        name: 'Samuel Worku',
        email: 'lab@abay-hospital.et',
        password: 'Staff@1234',
        dept: 'Laboratory',
        icon: '🧪',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
    },
    {
        role: 'RADIOLOGIST',
        title: 'Radiologist',
        name: 'Hiwot Alemu',
        email: 'radiology@abay-hospital.et',
        password: 'Staff@1234',
        dept: 'Radiology',
        icon: '🩻',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200',
    },
    {
        role: 'PHARMACIST',
        title: 'Pharmacist',
        name: 'Biruk Tadesse',
        email: 'pharmacy@abay-hospital.et',
        password: 'Staff@1234',
        dept: 'Pharmacy',
        icon: '💊',
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200',
    },
    {
        role: 'CASHIER',
        title: 'Cashier',
        name: 'Rahel Seifu',
        email: 'cashier@abay-hospital.et',
        password: 'Staff@1234',
        dept: 'Finance & Billing',
        icon: '💳',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
    },
];

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeDemo, setActiveDemo] = useState<string | null>(null);
    const [error, setError] = useState('');

    const executeLogin = async (targetEmail: string, targetPassword: string, roleName?: string) => {
        setError('');
        setLoading(true);
        if (roleName) setActiveDemo(roleName);

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: targetEmail, password: targetPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Invalid credentials. Please try again.');
                return;
            }
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            login(data.user);
            router.push(ROLE_REDIRECTS[data.user.role] || '/');
        } catch {
            setError('Unable to connect to the server. Please check backend API server.');
        } finally {
            setLoading(false);
            setActiveDemo(null);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeLogin(email, password);
    };

    const handleDemoClick = (account: DemoAccount) => {
        setEmail(account.email);
        setPassword(account.password);
        executeLogin(account.email, account.password, account.role);
    };

    return (
        <div className="min-h-screen flex">
            {/* ── Left Panel: Branding ── */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-12 text-white relative overflow-hidden">
                <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
                <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center border border-blue-400/30">
                            <span className="text-2xl">🏥</span>
                        </div>
                        <p className="text-xs text-blue-300 font-medium tracking-widest uppercase">Hospital Management System</p>
                    </div>
                    <h1 className="text-4xl font-bold mt-6 leading-tight">
                        Abay General<br />
                        <span className="text-blue-300">Hospital</span>
                    </h1>
                    <p className="text-slate-400 mt-1 text-lg">ዓባይ አጠቃላይ ሆስፒታል</p>
                </div>

                {/* Feature bullets */}
                <div className="relative z-10 space-y-4">
                    {[
                        { icon: '🩺', title: 'Multi-Role Access', desc: 'Separate portals for doctors, nurses, reception, lab, and admin' },
                        { icon: '🔒', title: 'Secure Authentication', desc: 'Role-based access with encrypted session tokens' },
                        { icon: '📊', title: 'Real-Time Dashboard', desc: 'Live patient queues, bed management, and analytics' },
                    ].map((f) => (
                        <div key={f.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                            <span className="text-2xl">{f.icon}</span>
                            <div>
                                <p className="font-semibold text-sm">{f.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="relative z-10 text-xs text-slate-500">
                    © 2026 Abay General Hospital · All rights reserved
                </div>
            </div>

            {/* ── Right Panel: Login Form & Quick Demo ── */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 overflow-y-auto">
                <div className="w-full max-w-lg my-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <span className="text-5xl">🏥</span>
                        <h1 className="text-2xl font-bold text-slate-800 mt-2">Abay General Hospital</h1>
                        <p className="text-slate-500 text-sm">ዓባይ አጠቃላይ ሆስፒታል</p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-xl font-bold text-slate-800">Staff Sign In</h2>
                            </div>
                            <p className="text-sm text-slate-500">Enter your credentials or select a demo account below.</p>
                        </div>

                        {/* Demo Accounts Quick Login Panel */}
                        <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-xl p-4 border border-indigo-100">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Instant 1-Click Demo Login</span>
                                </div>
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                                    8 Demo Accounts
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {DEMO_ACCOUNTS.map((acc) => {
                                    const isThisLoading = loading && activeDemo === acc.role;
                                    return (
                                        <button
                                            key={acc.role}
                                            type="button"
                                            disabled={loading}
                                            onClick={() => handleDemoClick(acc)}
                                            className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-left transition transform active:scale-95 text-xs ${acc.badgeColor} disabled:opacity-50`}
                                            title={`Login as ${acc.name} (${acc.dept})`}
                                        >
                                            <span className="text-base mb-1">{acc.icon}</span>
                                            <span className="font-bold text-[11px] truncate w-full text-center">{acc.title}</span>
                                            <span className="text-[9px] opacity-75 truncate w-full text-center">
                                                {isThisLoading ? 'Signing in...' : acc.name.split(' ')[0]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Standard Form */}
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                                    Staff Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        id="login-email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="staff@abay-hospital.et"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                                    <span className="mt-0.5">⚠️</span>
                                    <p className="text-xs">{error}</p>
                                </div>
                            )}

                            <button
                                id="login-submit"
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
                            >
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Authenticating...</> : 'Sign In to Dashboard'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

