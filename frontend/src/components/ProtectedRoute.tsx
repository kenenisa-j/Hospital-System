"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export default function ProtectedRoute({
    children,
    allowedRoles = [],
}: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (
                allowedRoles.length > 0 &&
                !allowedRoles.includes(user.role)
            ) {
                router.push("/unauthorized");
            }
        }
    }, [user, loading, allowedRoles, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center space-y-3">
                    <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">
                        Verifying staff credentials...
                    </p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}