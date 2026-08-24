import { Server, Socket } from 'socket.io';

export enum NotificationType {
    NEW_QUEUE_PATIENT = 'NEW_QUEUE_PATIENT',
    LAB_RESULT_READY = 'LAB_RESULT_READY',
    PRESCRIPTION_PENDING = 'PRESCRIPTION_PENDING',
    LOW_STOCK_WARNING = 'LOW_STOCK_WARNING',
}

export interface NotificationPayload {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    targetRole?: string;
    targetDepartmentId?: string;
    linkUrl?: string;
    timestamp: string;
}

// The shared io instance — set once by server.ts after the server starts
let io: Server | null = null;

/**
 * Called from server.ts after the Socket.IO server is created.
 * Registers the join_channels event handler on the EXISTING io instance
 * so the notification engine can broadcast to role/department rooms.
 *
 * This avoids creating a second competing socket server.
 */
export const initSocketEngine = (existingIo: Server): Server => {
    io = existingIo;

    // Register the join_channels event handler for notification rooms.
    // Note: queueSocket.js already handles join_queue_room on the same io.
    io.on('connection', (socket: Socket) => {
        // Staff members subscribe to role and department channels for notifications
        socket.on('join_channels', (data: { role: string; departmentId?: string }) => {
            if (data.role) {
                socket.join(`role:${data.role}`);
            }
            if (data.departmentId) {
                socket.join(`dept:${data.departmentId}`);
            }
        });
    });

    return io;
};

/**
 * Send a real-time notification to a role room, department room, or broadcast.
 * Called from route handlers after clinical events (lab results, prescriptions, etc.)
 */
export const sendNotification = (payload: Omit<NotificationPayload, 'id' | 'timestamp'>): void => {
    if (!io) {
        // Socket not yet initialised — fail silently (non-critical path)
        return;
    }

    const fullNotification: NotificationPayload = {
        ...payload,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
    };

    if (payload.targetDepartmentId) {
        io.to(`dept:${payload.targetDepartmentId}`).emit('notification', fullNotification);
    } else if (payload.targetRole) {
        io.to(`role:${payload.targetRole}`).emit('notification', fullNotification);
    } else {
        io.emit('notification', fullNotification); // Broadcast system-wide
    }
};