import { pgTable, uuid, varchar, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema';
import { users } from './hospital.schema';

export const visits = pgTable('visits', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketNumber: varchar('ticket_number', { length: 30 }).notNull().unique(),
    patientId: uuid('patient_id').references(() => patients.id).notNull(),
    department: varchar('department', { length: 100 }).notNull(),
    assignedDoctorId: uuid('assigned_doctor_id').references(() => users.id),
    triagePriority: varchar('triage_priority', { length: 20 }).notNull().default('NORMAL'),
    paymentType: varchar('payment_type', { length: 30 }).notNull().default('CASH'),
    chiefComplaint: varchar('chief_complaint', { length: 500 }),
    status: varchar('status', { length: 30 }).notNull().default('WAITING'),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('PENDING'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        patientIdIdx: index('visits_patient_id_idx').on(table.patientId),
        assignedDoctorIdIdx: index('visits_assigned_doctor_id_idx').on(table.assignedDoctorId),
        statusIdx: index('visits_status_idx').on(table.status),
        createdAtIdx: index('visits_created_at_idx').on(table.createdAt),
    };
});

