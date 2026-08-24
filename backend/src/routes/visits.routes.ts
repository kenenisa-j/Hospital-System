import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { users, departments } from '../../../database/src/schema/hospital.schema';
import { visits } from '../../../database/src/schema/visits.schema';
import { eq, desc, like, or, and, sql } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { logAuditEvent } from '../utils/auditLogger';

const router = Router();

const createVisitSchema = z.object({
    patientId: z.string().uuid(),
    department: z.string().min(1),
    // Allow empty string — treat it as "no doctor assigned"
    assignedDoctorId: z.string().uuid().optional().or(z.literal('')).transform(v => (v === '' ? undefined : v)),
    triagePriority: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).default('NORMAL'),
    paymentType: z.enum(['CASH', 'INSURANCE', 'FREE_SCHEME']).default('CASH'),
    chiefComplaint: z.string().optional(),
});

// GET /api/visits — list all visits with patient info
router.get('/', authenticate, requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'LAB_MANAGER', 'PHARMACIST', 'CASHIER'), async (req: Request, res: Response) => {
    try {
        // Try fetching from visits table; if it doesn't exist yet, return empty
        const result = await db
            .select({
                id: visits.id,
                ticketNumber: visits.ticketNumber,
                patientName: patients.fullName,
                patientMrn: patients.mrn,
                visitDate: visits.createdAt,
                department: visits.department,
                doctor: users.fullName,
                totalAmount: visits.totalAmount,
                paidAmount: visits.paidAmount,
                paymentStatus: visits.paymentStatus,
            })
            .from(visits)
            .leftJoin(patients, eq(visits.patientId, patients.id))
            .leftJoin(users, eq(visits.assignedDoctorId, users.id))
            .orderBy(desc(visits.createdAt));

        return res.json({
            visits: result.map(v => ({
                ...v,
                visitDate: v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-GB') : '',
                doctor: v.doctor ?? 'Unassigned',
                totalAmount: parseFloat(v.totalAmount ?? '0'),
                paidAmount: parseFloat(v.paidAmount ?? '0'),
            }))
        });
    } catch (err: any) {
        if (err.code === '42P01') {
            // Table doesn't exist yet (migration not applied)
            return res.json({ visits: [] });
        }
        console.error('Error fetching visits:', err);
        return res.status(500).json({ error: 'Failed to fetch visits' });
    }
});

// GET /api/visits/:id — get single visit
router.get('/:id', authenticate, requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'LAB_MANAGER', 'PHARMACIST', 'CASHIER'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Auto-assign doctor and change status to IN_CONSULTATION if a DOCTOR accesses it
        if (req.user?.role === 'DOCTOR') {
            const [currentVisit] = await db
                .select({ status: visits.status, assignedDoctorId: visits.assignedDoctorId })
                .from(visits)
                .where(eq(visits.id, id))
                .limit(1);

            if (currentVisit && (currentVisit.status === 'WAITING' || !currentVisit.assignedDoctorId)) {
                await db
                    .update(visits)
                    .set({
                        assignedDoctorId: req.user.userId,
                        status: 'IN_CONSULTATION',
                        updatedAt: new Date()
                    })
                    .where(eq(visits.id, id));
            }
        }

        const [visit] = await db
            .select({
                id: visits.id,
                ticketNumber: visits.ticketNumber,
                patientId: visits.patientId,
                patientName: patients.fullName,
                patientMrn: patients.mrn,
                patientDob: patients.dateOfBirth,
                patientGender: patients.gender,
                patientPhone: patients.phoneNumber,
                patientAllergies: patients.knownAllergies,
                department: visits.department,
                doctor: users.fullName,
                assignedDoctorId: visits.assignedDoctorId,
                triagePriority: visits.triagePriority,
                paymentType: visits.paymentType,
                chiefComplaint: visits.chiefComplaint,
                status: visits.status,
                paymentStatus: visits.paymentStatus,
                totalAmount: visits.totalAmount,
                paidAmount: visits.paidAmount,
                createdAt: visits.createdAt,
            })
            .from(visits)
            .leftJoin(patients, eq(visits.patientId, patients.id))
            .leftJoin(users, eq(visits.assignedDoctorId, users.id))
            .where(eq(visits.id, id));

        if (!visit) return res.status(404).json({ error: 'Visit not found' });

        // Calculate age from dateOfBirth
        let age = 0;
        if (visit.patientDob) {
            const birthDate = new Date(visit.patientDob);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }

        // Format allergies to an array if stored as comma-separated list
        const allergies = visit.patientAllergies
            ? visit.patientAllergies.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        return res.json({
            visit: {
                id: visit.id,
                ticketNumber: visit.ticketNumber,
                department: visit.department,
                triagePriority: visit.triagePriority,
                paymentType: visit.paymentType,
                chiefComplaint: visit.chiefComplaint,
                status: visit.status,
                paymentStatus: visit.paymentStatus,
                totalAmount: parseFloat(visit.totalAmount ?? '0'),
                paidAmount: parseFloat(visit.paidAmount ?? '0'),
                createdAt: visit.createdAt,
                patient: {
                    id: visit.patientId,
                    mrn: visit.patientMrn,
                    fullName: visit.patientName,
                    age: age,
                    gender: visit.patientGender,
                    phoneNumber: visit.patientPhone,
                    allergies: allergies,
                }
            }
        });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(404).json({ error: 'Visits table not yet initialized' });
        return res.status(500).json({ error: 'Failed to fetch visit' });
    }
});

// POST /api/visits — create new visit/queue ticket
router.post('/', authenticate, requireRole('ADMIN', 'RECEPTIONIST'), async (req: Request, res: Response) => {
    try {
        const data = createVisitSchema.parse(req.body);

        // Generate ticket number: VIS-YYYYMMDD-NNNN
        const today = new Date();
        const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.floor(1000 + Math.random() * 9000);
        const ticketNumber = `VIS-${datePart}-${rand}`;

        const [newVisit] = await db
            .insert(visits)
            .values({
                ticketNumber,
                patientId: data.patientId,
                department: data.department,
                assignedDoctorId: (data.assignedDoctorId && data.assignedDoctorId !== '') ? data.assignedDoctorId : null,
                triagePriority: data.triagePriority,
                paymentType: data.paymentType,
                chiefComplaint: data.chiefComplaint ?? null,
            })
            .returning();

        await logAuditEvent({
            userId: (req as any).user?.userId || 'unknown',
            userRole: (req as any).user?.role || 'RECEPTIONIST',
            action: 'VISIT_CREATED',
            entityType: 'visit',
            entityId: newVisit.id,
            changes: { after: { ticketNumber, patientId: data.patientId, department: data.department } },
            ipAddress: req.ip,
        });

        return res.status(201).json({ message: 'Visit created', visit: newVisit });
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            const msg = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
            return res.status(400).json({ error: msg });
        }
        if (err.code === '42P01') {
            return res.status(503).json({ error: 'Visits table not yet initialized. Run database migrations.' });
        }
        console.error('Error creating visit:', err);
        return res.status(500).json({ error: 'Failed to create visit' });
    }
});

export default router;
