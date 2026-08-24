import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { db } from "../../../database/src/db";
import { auditLogs } from "../../../database/src/schema/audit.schema";
import { users } from "../../../database/src/schema/hospital.schema";
import { eq, desc, like, or, sql } from "drizzle-orm";

const router = Router();

// GET /api/audit — Fetch paginated audit logs (Admin only)
router.get("/", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        const q = (req.query.q as string) || "";
        const limit = parseInt((req.query.limit as string) || "50", 10);

        let query = db
            .select({
                id: auditLogs.id,
                userRole: auditLogs.userRole,
                action: auditLogs.action,
                entityType: auditLogs.entityType,
                entityId: auditLogs.entityId,
                ipAddress: auditLogs.ipAddress,
                createdAt: auditLogs.createdAt,
                userName: users.fullName,
            })
            .from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id));

        const logs = await query.orderBy(desc(auditLogs.createdAt)).limit(limit);

        return res.json({ logs });
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        return res.status(500).json({ error: "Failed to retrieve audit logs" });
    }
});

export default router;
