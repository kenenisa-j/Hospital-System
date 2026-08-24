import { pgTable, uuid, varchar, text, jsonb, timestamp, inet } from "drizzle-orm/pg-core";
import { users } from "./hospital.schema";

export const auditLogs = pgTable("audit_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userRole: varchar("user_role", { length: 50 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(), // e.g., "CREATE_MEDICAL_RECORD", "UPDATE_INVOICE"
    entityType: varchar("entity_type", { length: 100 }).notNull(), // e.g., "PATIENT", "INVOICE"
    entityId: varchar("entity_id", { length: 100 }).notNull(),
    changes: jsonb("changes"), // Holds { before: {...}, after: {...} }
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});