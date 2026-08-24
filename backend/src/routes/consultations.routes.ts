import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { users, medicalRecords } from '../../../database/src/schema/hospital.schema';
import { visits } from '../../../database/src/schema/visits.schema';
import { eq, desc, or, and, gte } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { logAuditEvent } from '../utils/auditLogger';
import { 
    consultations, 
    diagnoses, 
    clinicalOrders, 
    labCatalog, 
    labOrders, 
    radiologyCatalog, 
    radiologyOrders 
} from '../../../database/src/schema/wizard.schema';

const router = Router();

// GET /api/consultations/:visitId — Get or initialize a consultation for a visit
router.get('/:visitId', authenticate, requireRole('DOCTOR', 'NURSE', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { visitId } = req.params;

        const [consultation] = await db
            .select()
            .from(consultations)
            .where(eq(consultations.visitId, visitId));

        return res.json({ consultation: consultation ?? null });
    } catch (err: any) {
        if (err.code === '42P01') return res.json({ consultation: null });
        console.error('Error fetching consultation:', err);
        return res.status(500).json({ error: 'Failed to fetch consultation' });
    }
});

// PUT /api/consultations/:visitId — Save / update consultation encounter notes and vitals
router.put('/:visitId', authenticate, requireRole('DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { visitId } = req.params;
        const { patientId, vitals, clinicalNotes, status } = req.body;

        const existing = await db.select().from(consultations).where(eq(consultations.visitId, visitId));

        let result;
        if (existing.length > 0) {
            [result] = await db
                .update(consultations)
                .set({ vitals, clinicalNotes, status: status ?? 'IN_PROGRESS', updatedAt: new Date() })
                .where(eq(consultations.visitId, visitId))
                .returning();
        } else {
            if (!patientId) return res.status(400).json({ error: 'patientId is required to create a consultation' });
            [result] = await db
                .insert(consultations)
                .values({ visitId, patientId, vitals, clinicalNotes, status: status ?? 'IN_PROGRESS' })
                .returning();
        }

        // Set corresponding visit status to COMPLETED and assign doctor if not already
        await db
            .update(visits)
            .set({
                status: 'COMPLETED',
                assignedDoctorId: req.user?.userId,
                updatedAt: new Date()
            })
            .where(eq(visits.id, visitId));

        // Audit log
        await logAuditEvent({
            userId: req.user?.userId || 'unknown',
            userRole: req.user?.role || 'DOCTOR',
            action: 'CONSULTATION_SAVED',
            entityType: 'consultation',
            entityId: result?.id || visitId,
            changes: { after: { visitId, status: status ?? 'IN_PROGRESS' } },
            ipAddress: req.ip,
        });

        return res.json({ message: 'Consultation saved', consultation: result });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Consultations table not yet initialized. Run database migrations.' });
        console.error('Error saving consultation:', err);
        return res.status(500).json({ error: 'Failed to save consultation' });
    }
});

// GET /api/consultations/:visitId/diagnoses — Get diagnoses for a visit
router.get('/:visitId/diagnoses', authenticate, requireRole('DOCTOR', 'NURSE', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { visitId } = req.params;
        const results = await db
            .select()
            .from(diagnoses)
            .where(eq(diagnoses.visitId, visitId))
            .orderBy(diagnoses.type, desc(diagnoses.createdAt));
        return res.json({ diagnoses: results });
    } catch (err: any) {
        if (err.code === '42P01') return res.json({ diagnoses: [] });
        return res.status(500).json({ error: 'Failed to fetch diagnoses' });
    }
});

// POST /api/consultations/:visitId/diagnoses — Add a diagnosis
router.post('/:visitId/diagnoses', authenticate, requireRole('DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { visitId } = req.params;
        const schema = z.object({
            icdCode: z.string().optional(),
            description: z.string().min(1),
            type: z.enum(['PRIMARY', 'SECONDARY', 'DIFFERENTIAL']).default('PRIMARY'),
        });
        const data = schema.parse(req.body);
        const [diagnosis] = await db
            .insert(diagnoses)
            .values({ visitId, ...data })
            .returning();

        await logAuditEvent({
            userId: req.user?.userId || 'unknown',
            userRole: req.user?.role || 'DOCTOR',
            action: 'DIAGNOSIS_CREATED',
            entityType: 'diagnosis',
            entityId: diagnosis.id,
            changes: { after: { visitId, icdCode: data.icdCode, description: data.description, type: data.type } },
            ipAddress: req.ip,
        });

        return res.status(201).json({ message: 'Diagnosis recorded', diagnosis });
    } catch (err: any) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
        if (err.code === '42P01') return res.status(503).json({ error: 'Diagnoses table not yet initialized.' });
        return res.status(500).json({ error: 'Failed to add diagnosis' });
    }
});

// GET /api/consultations/:visitId/orders — Get clinical orders (lab/radiology) for a visit
router.get('/:visitId/orders', authenticate, requireRole('DOCTOR', 'NURSE', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { visitId } = req.params;
        const results = await db
            .select()
            .from(clinicalOrders)
            .where(eq(clinicalOrders.visitId, visitId))
            .orderBy(desc(clinicalOrders.createdAt));
        return res.json({ orders: results });
    } catch (err: any) {
        if (err.code === '42P01') return res.json({ orders: [] });
        return res.status(500).json({ error: 'Failed to fetch clinical orders' });
    }
});

import { sql } from 'drizzle-orm';
import { prescriptions, prescriptionItems } from '../../../database/src/schema/wizard.schema';

// POST /api/consultations/:visitId/orders — Place clinical orders (bulk or single)
router.post('/:visitId/orders', authenticate, requireRole('DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { visitId } = req.params;
        const docId = req.user?.userId;

        // Resolve doctor name
        let doctorName = 'Consulting Physician';
        if (docId) {
            const [docRecord] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, docId)).limit(1);
            if (docRecord) doctorName = docRecord.fullName;
        }

        // Query visit to get patientId
        const [visitRecord] = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1);
        if (!visitRecord) return res.status(404).json({ error: 'Visit not found' });
        const patientId = visitRecord.patientId;

        const results: any = { prescriptions: [], labOrders: [], radiologyOrders: [], referral: null, skipped: [] };

        // ── Bulk payload from the consultation orders page ──
        const {
            prescriptions: rxList,
            labOrders: labList,
            radiologyOrders: radList,
            referral,
            // Legacy single-order fields
            type, testName, urgency, notes,
        } = req.body;

        // ── PRESCRIPTIONS (bulk array) ──
        if (Array.isArray(rxList) && rxList.length > 0) {
            // Count existing prescriptions for the RX number
            const countResult = await db.select({ count: sql<number>`count(*)` }).from(prescriptions);
            const base = Number(countResult[0]?.count || 0);
            const rxNumber = `RX-${new Date().getFullYear()}-${String(base + 1).padStart(5, '0')}`;

            const [rx] = await db.insert(prescriptions).values({
                rxNumber,
                visitId,
                patientId,
                doctorId: docId,
                doctorName,
                status: 'PENDING',
            }).returning();

            const itemRows = rxList.map((item: any) => ({
                prescriptionId: rx.id,
                medicationName: item.medicationName || item.name || 'Unknown',
                strength: item.strength || null,
                dosage: item.dosage || null,
                frequency: item.frequency || null,
                duration: item.duration || null,
                route: item.route || 'Oral',
                quantity: item.quantity ? parseInt(item.quantity) : 1,
                instructions: item.instructions || null,
                status: 'PENDING' as const,
            }));
            const items = await db.insert(prescriptionItems).values(itemRows).returning();
            results.prescriptions = [{ ...rx, items }];

            await logAuditEvent({
                userId: docId || 'unknown',
                userRole: req.user?.role || 'DOCTOR',
                action: 'PRESCRIPTION_CREATED',
                entityType: 'prescription',
                entityId: rx.id,
                changes: { after: { rxNumber: rx.rxNumber, visitId, patientId, itemCount: itemRows.length } },
                ipAddress: req.ip,
            });
        }

        // ── LAB ORDERS (bulk array) ──
        if (Array.isArray(labList) && labList.length > 0) {
            // Determine start of today for same-day duplicate check
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            for (const lab of labList) {
                const name: string = lab.testName || lab.name || '';
                const [test] = await db.select().from(labCatalog).where(eq(labCatalog.testName, name)).limit(1);
                if (test) {
                    // ── Duplicate guard: skip if an active order already exists today ──
                    const [existingOrder] = await db
                        .select({ id: labOrders.id, orderNumber: labOrders.orderNumber })
                        .from(labOrders)
                        .where(
                            and(
                                eq(labOrders.patientId, patientId),
                                eq(labOrders.testId, test.id),
                                gte(labOrders.createdAt, todayStart),
                                or(
                                    eq(labOrders.status, 'ORDERED'),
                                    eq(labOrders.status, 'SAMPLE_COLLECTED'),
                                    eq(labOrders.status, 'ACCEPTED'),
                                    eq(labOrders.status, 'PROCESSING'),
                                    eq(labOrders.status, 'RESULT_ENTERED'),
                                )
                            )
                        )
                        .limit(1);

                    if (existingOrder) {
                        // Duplicate found — skip and record in skipped list
                        results.skipped.push({
                            testName: name,
                            reason: `Already ordered today (${existingOrder.orderNumber})`,
                        });
                        continue;
                    }

                    const rand = Math.floor(1000 + Math.random() * 9000);
                    const orderNumber = `ORD-LAB-${Date.now().toString().slice(-6)}-${rand}`;
                    await db.insert(labOrders).values({
                        orderNumber,
                        patientId,
                        testId: test.id,
                        urgency: lab.urgency || 'ROUTINE',
                        orderingDoctorId: docId,
                        orderingDoctorName: doctorName,
                        status: 'ORDERED',
                    });
                    results.labOrders.push({ testName: name, status: 'ORDERED' });

                    await logAuditEvent({
                        userId: docId || 'unknown',
                        userRole: req.user?.role || 'DOCTOR',
                        action: 'LAB_ORDER_CREATED',
                        entityType: 'lab_order',
                        entityId: orderNumber,
                        changes: { after: { orderNumber, testName: name, urgency: lab.urgency || 'ROUTINE', patientId } },
                        ipAddress: req.ip,
                    });
                }
            }
        }

        // ── RADIOLOGY ORDERS (bulk array) ──
        if (Array.isArray(radList) && radList.length > 0) {
            for (const rad of radList) {
                const name: string = rad.bodySite ? `${rad.modality} ${rad.bodySite}` : (rad.testName || '');
                // Try exact match first, then partial
                let [exam] = await db.select().from(radiologyCatalog).where(eq(radiologyCatalog.examName, name)).limit(1);
                if (!exam && rad.modality) {
                    const allExams = await db.select().from(radiologyCatalog);
                    exam = allExams.find(e => e.modality === rad.modality) as any;
                }
                if (exam) {
                    const rand = Math.floor(1000 + Math.random() * 9000);
                    const orderNumber = `ORD-RAD-${Date.now().toString().slice(-6)}-${rand}`;
                    await db.insert(radiologyOrders).values({
                        orderNumber,
                        patientId,
                        examId: exam.id,
                        urgency: rad.urgency || 'ROUTINE',
                        orderingDoctorName: doctorName,
                        clinicalNotes: rad.reasonForExam || rad.notes || null,
                        status: 'ORDERED',
                    });
                    results.radiologyOrders.push({ examName: exam.examName, status: 'ORDERED' });
                }
            }
        }

        // ── LEGACY SINGLE ORDER fallback ──
        if (type && testName && !Array.isArray(rxList)) {
            const schema = z.object({
                type: z.enum(['LAB', 'RADIOLOGY', 'PRESCRIPTION']),
                testName: z.string().min(1),
                urgency: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
                notes: z.string().optional(),
            });
            const data = schema.parse(req.body);
            const [order] = await db.insert(clinicalOrders).values({ visitId, ...data }).returning();

            if (data.type === 'LAB') {
                const [test] = await db.select().from(labCatalog).where(eq(labCatalog.testName, data.testName)).limit(1);
                if (test) {
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);

                    const [existingOrder] = await db
                        .select({ id: labOrders.id, orderNumber: labOrders.orderNumber })
                        .from(labOrders)
                        .where(
                            and(
                                eq(labOrders.patientId, patientId),
                                eq(labOrders.testId, test.id),
                                gte(labOrders.createdAt, todayStart),
                                or(
                                    eq(labOrders.status, 'ORDERED'),
                                    eq(labOrders.status, 'SAMPLE_COLLECTED'),
                                    eq(labOrders.status, 'ACCEPTED'),
                                    eq(labOrders.status, 'PROCESSING'),
                                    eq(labOrders.status, 'RESULT_ENTERED'),
                                )
                            )
                        )
                        .limit(1);

                    if (existingOrder) {
                        return res.status(400).json({ error: `Duplicate order: "${data.testName}" is already ordered today for this patient (${existingOrder.orderNumber}).` });
                    }

                    const rand = Math.floor(1000 + Math.random() * 9000);
                    await db.insert(labOrders).values({
                        orderNumber: `ORD-LAB-${Date.now().toString().slice(-6)}-${rand}`,
                        patientId, testId: test.id, urgency: data.urgency,
                        orderingDoctorId: docId, orderingDoctorName: doctorName, status: 'ORDERED',
                    });
                }
            } else if (data.type === 'RADIOLOGY') {
                const [exam] = await db.select().from(radiologyCatalog).where(eq(radiologyCatalog.examName, data.testName)).limit(1);
                if (exam) {
                    const rand = Math.floor(1000 + Math.random() * 9000);
                    await db.insert(radiologyOrders).values({
                        orderNumber: `ORD-RAD-${Date.now().toString().slice(-6)}-${rand}`,
                        patientId, examId: exam.id, urgency: data.urgency,
                        orderingDoctorName: doctorName, clinicalNotes: data.notes, status: 'ORDERED',
                    });
                }
            }
            return res.status(201).json({ message: 'Order placed', order });
        }

        return res.status(201).json({
            message: 'Orders submitted successfully',
            summary: {
                prescriptions: results.prescriptions.length,
                labOrders: results.labOrders.length,
                radiologyOrders: results.radiologyOrders.length,
                skipped: results.skipped.length,
            },
            ...results,
        });
    } catch (err: any) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
        if (err.code === '42P01') return res.status(503).json({ error: 'Clinical orders table not yet initialized.' });
        console.error('Error placing clinical order:', err);
        return res.status(500).json({ error: 'Failed to place order' });
    }
});

export default router;

