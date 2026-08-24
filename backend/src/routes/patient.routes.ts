import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { generatePatientMRN } from '../utils/mrnGenerator';
import { logAuditEvent } from '../utils/auditLogger';

const router = Router();

const createPatientSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    phoneNumber: z.string().min(5, "Phone number is required"),
    address: z.string().optional().default(''),
    emergencyContactName: z.string().optional().default(''),
    emergencyContactPhone: z.string().optional().default(''),
    emergencyContactRelation: z.string().optional().default(''),
    bloodGroup: z.enum([
        'A_POSITIVE',
        'A_NEGATIVE',
        'B_POSITIVE',
        'B_NEGATIVE',
        'AB_POSITIVE',
        'AB_NEGATIVE',
        'O_POSITIVE',
        'O_NEGATIVE',
        'UNKNOWN',
    ]).optional().default('UNKNOWN'),
    knownAllergies: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial();

// GET /api/patients — Search or list registered patients
// Accessible to clinical and reception roles only — not pure billing/cashier roles
router.get('/', authenticate, requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'LAB_MANAGER', 'PHARMACIST'), async (req: Request, res: Response) => {
    try {
        const q = (req.query.q as string) || '';

        let queryBuilder = db.select().from(patients).orderBy(desc(patients.createdAt));

        if (q) {
            const searchPattern = `%${q}%`;
            queryBuilder = db
                .select()
                .from(patients)
                .where(
                    or(
                        ilike(patients.fullName, searchPattern),
                        ilike(patients.mrn, searchPattern),
                        ilike(patients.phoneNumber, searchPattern)
                    )
                )
                .orderBy(desc(patients.createdAt)) as any;
        }

        const patientList = await queryBuilder;
        return res.json({ patients: patientList });
    } catch (error) {
        console.error("Failed to fetch patients:", error);
        return res.status(500).json({ error: "Failed to retrieve patients catalog" });
    }
});

// POST /api/patients — Register new patient at reception
router.post('/', authenticate, requireRole('ADMIN', 'RECEPTIONIST'), async (req: Request, res: Response) => {
    try {
        const data = createPatientSchema.parse(req.body);
        const generatedMRN = await generatePatientMRN();

        const [newPatient] = await db
            .insert(patients)
            .values({
                ...data,
                mrn: generatedMRN,
            })
            .returning();

        await logAuditEvent({
            userId: (req as any).user?.userId || 'unknown',
            userRole: (req as any).user?.role || 'RECEPTIONIST',
            action: 'PATIENT_CREATED',
            entityType: 'patient',
            entityId: newPatient.id,
            changes: { after: { mrn: newPatient.mrn, fullName: newPatient.fullName } },
            ipAddress: req.ip,
        });

        return res.status(201).json({
            message: "Patient registered successfully",
            patient: newPatient,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error("Error registering patient:", error);
        return res.status(500).json({ error: "Internal server error registering patient" });
    }
});

// GET /api/patients/:id — Get single patient by ID
// Restricted to clinical and reception roles
router.get('/:id', authenticate, requireRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'LAB_MANAGER', 'PHARMACIST'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const [patient] = await db
            .select()
            .from(patients)
            .where(eq(patients.id, id));

        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        return res.json({ patient });
    } catch (error) {
        console.error('Failed to fetch patient by ID:', error);
        return res.status(500).json({ error: 'Failed to retrieve patient' });
    }
});

// PATCH /api/patients/:id — Update patient information
router.patch('/:id', authenticate, requireRole('ADMIN', 'RECEPTIONIST'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = updatePatientSchema.parse(req.body);

        const [before] = await db.select().from(patients).where(eq(patients.id, id));
        if (!before) return res.status(404).json({ error: 'Patient not found' });

        const [updated] = await db
            .update(patients)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(patients.id, id))
            .returning();

        await logAuditEvent({
            userId: (req as any).user?.userId || 'unknown',
            userRole: (req as any).user?.role || 'RECEPTIONIST',
            action: 'PATIENT_UPDATED',
            entityType: 'patient',
            entityId: id,
            changes: {
                before: { fullName: before.fullName, phoneNumber: before.phoneNumber },
                after: { fullName: updated.fullName, phoneNumber: updated.phoneNumber },
            },
            ipAddress: req.ip,
        });

        return res.json({ message: 'Patient updated', patient: updated });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error updating patient:', error);
        return res.status(500).json({ error: 'Failed to update patient' });
    }
});

export default router;