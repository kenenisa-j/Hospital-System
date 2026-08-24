'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Hospital } from 'lucide-react';

const ROLE_REDIRECTS: Record<string, string> = {
    ADMIN: '/admin/staff',
    RECEPTIONIST: '/reception/dashboard',
    DOCTOR: '/doctor/dashboard',
    NURSE: '/nurse',
    LAB_TECHNICIAN: '/lab/queue',
    RADIOLOGIST: '/radiology/queue',
    PHARMACIST: '/pharmacy',
    CASHIER: '/cashier',
};

export default function RootPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
            } else {
                const destination = ROLE_REDIRECTS[user.role] || '/login';
                router.replace(destination);
            }
        }
    }, [user, loading, router]);

    // Show a full-screen spinner while checking auth state
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="flex flex-col items-center gap-4 text-white">
                <Hospital className="w-12 h-12 text-indigo-400" />
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-slate-400 text-sm font-medium">Loading Abay HMS...</p>
            </div>
        </div>
    );
}