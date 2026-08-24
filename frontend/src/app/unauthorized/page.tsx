'use client';

import { useRouter } from 'next/navigation';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function UnauthorizedPage() {
    const router = useRouter();
    const { user, logout } = useAuth();

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <div className="text-center max-w-md space-y-5">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <ShieldX className="w-10 h-10 text-red-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        Your account role (<strong>{user?.role || 'Unknown'}</strong>) does not have permission to view this page.
                    </p>
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-700"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition text-white"
                    >
                        <Home className="w-4 h-4" /> Dashboard
                    </button>
                </div>
                <button
                    onClick={logout}
                    className="text-xs text-slate-400 underline hover:text-slate-600"
                >
                    Sign out and switch account
                </button>
            </div>
        </div>
    );
}
