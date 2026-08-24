"use client";

import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
    Bell,
    UserPlus,
    FlaskConical,
    Pill,
    AlertTriangle,
    X,
    CheckCheck,
    ExternalLink
} from "lucide-react";

interface NotificationItem {
    id: string;
    type: 'NEW_QUEUE_PATIENT' | 'LAB_RESULT_READY' | 'PRESCRIPTION_PENDING' | 'LOW_STOCK_WARNING';
    title: string;
    message: string;
    linkUrl?: string;
    timestamp: string;
    read?: boolean;
}

export default function NotificationBell({ userRole, departmentId }: { userRole: string; departmentId?: string }) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Connect to Socket.IO server (Adjust port if running separately)
        const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000");

        socket.on("connect", () => {
            socket.emit("join_channels", { role: userRole, departmentId });
        });

        socket.on("notification", (newNotif: NotificationItem) => {
            setNotifications((prev) => [{ ...newNotif, read: false }, ...prev]);
        });

        return () => {
            socket.disconnect();
        };
    }, [userRole, departmentId]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
    };

    const getNotificationIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'NEW_QUEUE_PATIENT':
                return <UserPlus className="w-4 h-4 text-indigo-600" />;
            case 'LAB_RESULT_READY':
                return <FlaskConical className="w-4 h-4 text-emerald-600" />;
            case 'PRESCRIPTION_PENDING':
                return <Pill className="w-4 h-4 text-sky-600" />;
            case 'LOW_STOCK_WARNING':
                return <AlertTriangle className="w-4 h-4 text-rose-600" />;
        }
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition focus:outline-none"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Floating Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                >
                                    <CheckCheck className="w-3 h-3" /> Mark read
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                No notifications right now.
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-3 transition flex gap-3 ${item.read ? 'bg-white opacity-70' : 'bg-slate-50/80'}`}
                                >
                                    <div className="mt-0.5 p-2 rounded-lg bg-white border border-slate-100 shadow-sm shrink-0 h-fit">
                                        {getNotificationIcon(item.type)}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                                            <span className="text-[9px] text-slate-400 font-medium">
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-600 leading-snug">{item.message}</p>

                                        {item.linkUrl && (
                                            <a
                                                href={item.linkUrl}
                                                onClick={() => setIsOpen(false)}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline pt-1"
                                            >
                                                View Details <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}