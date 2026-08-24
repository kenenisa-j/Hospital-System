'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Hospital } from 'lucide-react';

// Routes where the top header should NOT appear
const HEADER_HIDDEN_ROUTES = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const showHeader = !HEADER_HIDDEN_ROUTES.includes(pathname);

    const ROLE_LABELS: Record<string, string> = {
        ADMIN: 'System Administrator',
        RECEPTIONIST: 'Reception & Queue',
        DOCTOR: 'Medical Officer',
        NURSE: 'Nursing Staff',
        LAB_TECHNICIAN: 'Laboratory',
        RADIOLOGIST: 'Radiology',
        PHARMACIST: 'Pharmacy',
        CASHIER: 'Cashier / Billing',
    };

    const ROLE_COLORS: Record<string, string> = {
        ADMIN: 'bg-purple-600',
        RECEPTIONIST: 'bg-emerald-600',
        DOCTOR: 'bg-blue-600',
        NURSE: 'bg-rose-600',
        LAB_TECHNICIAN: 'bg-amber-600',
        RADIOLOGIST: 'bg-cyan-600',
        PHARMACIST: 'bg-teal-600',
        CASHIER: 'bg-orange-600',
    };

    return (
        <>
            {showHeader && user && (
                <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg border-b border-slate-800">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
                        {/* Logo / Name */}
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2.5 hover:opacity-80 transition"
                        >
                            <Hospital className="w-6 h-6 text-indigo-400" />
                            <div className="hidden sm:block">
                                <p className="text-sm font-bold leading-tight">Abay General Hospital</p>
                                <p className="text-[10px] text-slate-400 leading-tight">ዓባይ አጠቃላይ ሆስፒታል</p>
                            </div>
                        </button>

                        {/* User info + logout */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                                <div className={`w-2 h-2 rounded-full ${ROLE_COLORS[user.role] || 'bg-slate-500'}`} />
                                <div>
                                    <p className="text-xs font-semibold text-white leading-tight">{user.fullName}</p>
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                        {ROLE_LABELS[user.role] || user.role} · {user.department}
                                    </p>
                                </div>
                            </div>

                            {/* Mobile: icon only */}
                            <div className="sm:hidden flex items-center gap-1.5 text-slate-300 text-xs">
                                <User className="w-4 h-4" />
                                <span>{user.fullName.split(' ')[0]}</span>
                            </div>

                            <button
                                type="button"
                                onClick={logout}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-red-700 border border-slate-700 hover:border-red-600 px-3 py-1.5 rounded-lg transition"
                                title="Sign out"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </header>
            )}

            <main className={showHeader && user ? 'p-6 max-w-screen-2xl mx-auto' : ''}>
                {children}
            </main>
        </>
    );
}
