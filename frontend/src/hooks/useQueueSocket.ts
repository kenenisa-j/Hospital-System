import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

interface PatientQueueItem {
    id: string;
    ticketNumber: string;
    patientName: string;
    patientMrn: string;
    department: string;
    doctorId?: string;
    status: "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "PENDING_PAYMENT";
    arrivalTime: string;
    triagePriority: "NORMAL" | "URGENT" | "EMERGENCY";
    age?: number;
    gender?: string;
}

export function useQueueSocket(department: string, doctorId?: string) {
    const [queue, setQueue] = useState<PatientQueueItem[]>([]);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [lastNotification, setLastNotification] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Initialize Socket Connection
        const socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ["websocket"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
            // Join specific department or doctor queue room
            socket.emit("join_queue_room", { department, doctorId });
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        // Event 1: Initial Sync on Room Join
        socket.on("queue_sync", (initialQueue: PatientQueueItem[]) => {
            setQueue(initialQueue);
        });

        // Event 2: Real-time Patient Payment Clearance (Triggers instantly upon Cashier Approval)
        socket.on("patient_cleared_payment", (clearedPatient: PatientQueueItem) => {
            setQueue((prevQueue) => {
                // Prevent duplicate entries
                const exists = prevQueue.some((item) => item.id === clearedPatient.id);
                if (exists) {
                    return prevQueue.map((item) => (item.id === clearedPatient.id ? clearedPatient : item));
                }
                return [clearedPatient, ...prevQueue];
            });
            setLastNotification(`New Patient Arrived: Ticket #${clearedPatient.ticketNumber}`);
        });

        // Event 3: Queue Status Changes (e.g., Called by Doctor, Completed, Transferred)
        socket.on("queue_updated", (updatedQueue: PatientQueueItem[]) => {
            setQueue(updatedQueue);
        });

        return () => {
            socket.disconnect();
        };
    }, [department, doctorId]);

    return { queue, isConnected, lastNotification, setLastNotification };
}