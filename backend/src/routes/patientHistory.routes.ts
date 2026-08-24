import { Router, Request, Response } from 'express';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { appointments, medicalRecords, users, departments } from '../../../database/src/schema/hospital.schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { pgTable, uuid, varchar, decimal, timestamp } from 'drizzle-orm/pg-core';

// Inline visits reference
const visits = pgTable('visits', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketNumber: varchar('ticket_number', { length: 30 }).notNull().unique(),
    patientId: uuid('patient_id').references(() => patients.id).notNull(),
    department: varchar('department', { length: 100 }).notNull(),
    assignedDoctorId: uuid('assigned_doctor_id').references(() => users.id),
    status: varchar('status', { length: 30 }).notNull().default('WAITING'),
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('PENDING'),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

const router = Router();

// GET /api/patients/:id/history — patient medical and visit history
router.get('/:id/history', authenticate, requireRole('DOCTOR', 'NURSE', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [patient] = await db.select().from(patients).where(eq(patients.id, id));
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        // Fetch medical records
        let medRecords: any[] = [];
        try {
            medRecords = await db
                .select()
                .from(medicalRecords)
                .where(eq(medicalRecords.patientId, id))
                .orderBy(desc(medicalRecords.createdAt));
        } catch { /* table may not exist */ }

        // Fetch appointments
        let appts: any[] = [];
        try {
            appts = await db
                .select({
                    id: appointments.id,
                    appointmentDate: appointments.appointmentDate,
                    status: appointments.status,
                    department: departments.name,
                    createdAt: appointments.createdAt,
                })
                .from(appointments)
                .leftJoin(departments, eq(appointments.departmentId, departments.id))
                .where(eq(appointments.patientId, id))
                .orderBy(desc(appointments.appointmentDate));
        } catch { /* table may not exist */ }

        // Fetch visits
        let visitHistory: any[] = [];
        try {
            visitHistory = await db
                .select({
                    id: visits.id,
                    ticketNumber: visits.ticketNumber,
                    department: visits.department,
                    status: visits.status,
                    paymentStatus: visits.paymentStatus,
                    totalAmount: visits.totalAmount,
                    visitDate: visits.createdAt,
                    doctor: users.fullName,
                })
                .from(visits)
                .leftJoin(users, eq(visits.assignedDoctorId, users.id))
                .where(eq(visits.patientId, id))
                .orderBy(desc(visits.createdAt));
        } catch { /* visits table may not exist yet */ }

        return res.json({
            patient,
            medicalRecords: medRecords,
            appointments: appts,
            visits: visitHistory,
            labOrders: [],
            radiologyOrders: [],
        });
    } catch (err) {
        console.error('Error fetching patient history:', err);
        return res.status(500).json({ error: 'Failed to fetch patient history' });
    }
});

export default router;
