import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
    title: 'Abay General Hospital | HMS',
    description: 'Hospital Management System for Abay General Hospital — ዓባይ አጠቃላይ ሆስፒታል',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen antialiased bg-slate-50 text-slate-900" suppressHydrationWarning>
                <AuthProvider>
                    <AppShell>{children}</AppShell>
                </AuthProvider>
            </body>
        </html>
    );
}