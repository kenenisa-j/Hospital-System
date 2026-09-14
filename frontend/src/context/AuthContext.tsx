"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface User {
    id: string;
    staffId: string;
    fullName: string;
    email: string;
    role: string;
    department: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (userData: User) => void;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = "abay_hms_user";

function readCache(): User | null {
    try {
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

function writeCache(user: User | null) {
    try {
        if (typeof window === "undefined") return;
        if (user) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(CACHE_KEY);
        }
    } catch {
        // ignore storage errors
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Pre-populate synchronously from cache so returning users skip the spinner.
    const cached = readCache();
    const [user, setUser] = useState<User | null>(cached);
    // If we have a cached user, we can skip the initial loading state entirely.
    const [loading, setLoading] = useState<boolean>(!cached);
    const router = useRouter();

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

    const checkAuth = async () => {
        try {
            const token =
                typeof window !== "undefined"
                    ? localStorage.getItem("token")
                    : null;
            const headers: Record<string, string> = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                credentials: "include",
                headers,
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                writeCache(data.user);
            } else {
                // Token invalid/expired — clear cache and user
                setUser(null);
                writeCache(null);
            }
        } catch {
            // Network error: keep cached user so UI stays visible offline
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Always validate token in background. If cache was present,
        // loading is already false so the UI doesn't block.
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        writeCache(userData);
    };

    const logout = async () => {
        try {
            const token =
                typeof window !== "undefined"
                    ? localStorage.getItem("token")
                    : null;
            const headers: Record<string, string> = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: "POST",
                credentials: "include",
                headers,
            });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            if (typeof window !== "undefined") {
                localStorage.removeItem("token");
            }
            writeCache(null);
            setUser(null);
            router.push("/login");
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}