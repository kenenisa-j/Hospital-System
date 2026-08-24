import { db } from "../../../database/src/db";
import { auditLogs } from "../../../database/src/schema/audit.schema";

interface LogAuditEventInput {
    userId: string;
    userRole: string;
    action: string;
    entityType: string;
    entityId: string;
    changes?: { before?: unknown; after?: unknown };
    ipAddress?: string;
    userAgent?: string;
}

export async function logAuditEvent(data: LogAuditEventInput): Promise<void> {
    try {
        await db.insert(auditLogs).values({
            userId: data.userId,
            userRole: data.userRole,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            changes: data.changes ?? null,
            ipAddress: data.ipAddress ?? null,
            userAgent: data.userAgent ?? null,
        });
    } catch (error) {
        // Log error to monitoring service without throwing to avoid interrupting primary workflow
        console.error("Failed to write immutable audit log:", error);
    }
}