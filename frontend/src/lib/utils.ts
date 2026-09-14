import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getErrorMessage(error: any, fallback = "An unexpected error occurred."): string {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (Array.isArray(error)) {
        return error.map(e => e.message || (typeof e === "object" ? JSON.stringify(e) : String(e))).join(", ");
    }
    if (typeof error === "object") {
        if (error.message && typeof error.message === "string") return error.message;
        return JSON.stringify(error);
    }
    return String(error);
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };
    if (token && !headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, {
        ...options,
        headers,
        credentials: options.credentials || 'include',
    });
}