"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <div className="bg-red-50 p-4 rounded-full text-red-600 mb-4">
                <ShieldAlert className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
            <p className="text-slate-600 max-w-md mt-2">
                Your assigned staff account role does not have permission to access this departmental module.
            </p>
            <Link
                href="/"
                className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors"
            >
                Return to Portal Home
            </Link>
        </div>
    );
}