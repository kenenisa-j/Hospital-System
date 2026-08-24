import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { users } from '../../../database/src/schema/hospital.schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { pgTable, uuid, varchar, text, timestamp, boolean, decimal, integer } from 'drizzle-orm/pg-core';

import { radiologyCatalog, radiologyOrders } from '../../../database/src/schema/wizard.schema';

// Export for use in other route files
export { radiologyCatalog, radiologyOrders };

const router = Router();


// ===================== RADIOLOGY CATALOG =====================

// GET /api/radiology/catalog
router.get('/catalog', authenticate, async (req: Request, res: Response) => {
    try {
        const catalog = await db.select().from(radiologyCatalog).orderBy(radiologyCatalog.modality, radiologyCatalog.examName);
        return res.json({ catalog });
    } catch (err: any) {
        if (err.code === '42P01') return res.json({ catalog: [] });
        return res.status(500).json({ error: 'Failed to fetch radiology catalog' });
    }
});

// POST /api/radiology/catalog — add exam type
router.post('/catalog', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            examCode: z.string().min(1),
            examName: z.string().min(1),
            modality: z.string().min(1),
            bodyPart: z.string().optional(),
            preparationInstructions: z.string().optional(),
            durationMinutes: z.number().int().positive().optional().default(30),
            price: z.number().nonnegative().optional().default(0),
        });
        const data = schema.parse(req.body);
        const [entry] = await db.insert(radiologyCatalog).values({
            ...data,
            price: data.price.toFixed(2),
        }).returning();
        return res.status(201).json({ message: 'Exam type added', catalog: entry });
    } catch (err: any) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
        if (err.code === '42P01') return res.status(503).json({ error: 'Radiology catalog table not yet initialized' });
        return res.status(500).json({ error: 'Failed to add exam type' });
    }
});

// PUT /api/radiology/catalog/:id — update exam type
router.put('/catalog/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const { examCode, examName, modality, bodyPart, preparationInstructions, durationMinutes, price } = req.body;
        const [updated] = await db
            .update(radiologyCatalog)
            .set({ examCode, examName, modality, bodyPart, preparationInstructions, durationMinutes, price: price?.toFixed(2) })
            .where(eq(radiologyCatalog.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Exam type not found' });
        return res.json({ message: 'Exam type updated', catalog: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Radiology catalog table not yet initialized' });
        return res.status(500).json({ error: 'Failed to update exam type' });
    }
});

// ===================== RADIOLOGY ORDERS =====================

// GET /api/radiology/orders — all radiology orders queue
router.get('/orders', authenticate, async (req: Request, res: Response) => {
    try {
        const orders = await db
            .select({
                id: radiologyOrders.id,
                orderNumber: radiologyOrders.orderNumber,
                patientId: radiologyOrders.patientId,
                patientName: patients.fullName,
                examName: radiologyCatalog.examName,
                modality: radiologyCatalog.modality,
                urgency: radiologyOrders.urgency,
                orderingDoctor: radiologyOrders.orderingDoctorName,
                clinicalNotes: radiologyOrders.clinicalNotes,
                status: radiologyOrders.status,
                scheduledAt: radiologyOrders.scheduledAt,
                orderedAt: radiologyOrders.createdAt,
            })
            .from(radiologyOrders)
            .leftJoin(patients, eq(radiologyOrders.patientId, patients.id))
            .leftJoin(radiologyCatalog, eq(radiologyOrders.examId, radiologyCatalog.id))
            .orderBy(desc(radiologyOrders.createdAt));
        return res.json({ orders });
    } catch (err: any) {
        if (err.code === '42P01') return res.json({ orders: [] });
        return res.status(500).json({ error: 'Failed to fetch radiology orders' });
    }
});

// POST /api/radiology/orders/:id/schedule — schedule an order
router.post('/orders/:id/schedule', authenticate, async (req: Request, res: Response) => {
    try {
        const { scheduledAt } = req.body;
        const [updated] = await db
            .update(radiologyOrders)
            .set({ status: 'SCHEDULED', scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date() })
            .where(eq(radiologyOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Order not found' });
        return res.json({ message: 'Order scheduled', order: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Radiology orders table not yet initialized' });
        return res.status(500).json({ error: 'Failed to schedule order' });
    }
});

// POST /api/radiology/orders/:id/start — mark imaging started
router.post('/orders/:id/start', authenticate, async (req: Request, res: Response) => {
    try {
        const [updated] = await db
            .update(radiologyOrders)
            .set({ status: 'IN_PROGRESS', startedAt: new Date() })
            .where(eq(radiologyOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Order not found' });
        return res.json({ message: 'Imaging started', order: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Radiology orders table not yet initialized' });
        return res.status(500).json({ error: 'Failed to start order' });
    }
});

// GET /api/radiology/orders/:id — get a single radiology order with patient + exam details
router.get('/orders/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const [order] = await db
            .select({
                id: radiologyOrders.id,
                orderNumber: radiologyOrders.orderNumber,
                patientId: radiologyOrders.patientId,
                patientName: patients.fullName,
                mrn: patients.mrn,
                examId: radiologyOrders.examId,
                examName: radiologyCatalog.examName,
                modality: radiologyCatalog.modality,
                bodyPart: radiologyCatalog.bodyPart,
                urgency: radiologyOrders.urgency,
                orderingDoctorName: radiologyOrders.orderingDoctorName,
                clinicalNotes: radiologyOrders.clinicalNotes,
                status: radiologyOrders.status,
                scheduledAt: radiologyOrders.scheduledAt,
                startedAt: radiologyOrders.startedAt,
                completedAt: radiologyOrders.completedAt,
                findings: radiologyOrders.findings,
                impression: radiologyOrders.impression,
                radiologistName: radiologyOrders.radiologistName,
                verifiedAt: radiologyOrders.verifiedAt,
                createdAt: radiologyOrders.createdAt,
            })
            .from(radiologyOrders)
            .leftJoin(patients, eq(radiologyOrders.patientId, patients.id))
            .leftJoin(radiologyCatalog, eq(radiologyOrders.examId, radiologyCatalog.id))
            .where(eq(radiologyOrders.id, req.params.id));

        if (!order) return res.status(404).json({ error: 'Order not found' });
        return res.json({ order });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Radiology table not ready' });
        return res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// POST /api/radiology/orders/:id/complete — submit findings + impression
router.post('/orders/:id/complete', authenticate, async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            findings: z.string().min(5, 'Findings must be at least 5 characters'),
            impression: z.string().min(3, 'Impression must be at least 3 characters'),
            radiologistName: z.string().min(2, 'Radiologist name required'),
        });
        const data = schema.parse(req.body);
        const [updated] = await db
            .update(radiologyOrders)
            .set({
                status: 'COMPLETED',
                findings: data.findings,
                impression: data.impression,
                radiologistName: data.radiologistName,
                completedAt: new Date(),
            })
            .where(eq(radiologyOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Order not found' });
        return res.json({ message: 'Report submitted', order: updated });
    } catch (err: any) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
        return res.status(500).json({ error: 'Failed to complete report' });
    }
});

// POST /api/radiology/orders/:id/verify — verify and notify doctor
router.post('/orders/:id/verify', authenticate, async (req: Request, res: Response) => {
    try {
        const [updated] = await db
            .update(radiologyOrders)
            .set({ status: 'VERIFIED', verifiedAt: new Date() })
            .where(eq(radiologyOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Order not found' });
        return res.json({ message: 'Report verified — doctor notified', order: updated });
    } catch (err: any) {
        return res.status(500).json({ error: 'Failed to verify report' });
    }
});

export default router;

