import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { services } from '../../../database/src/schema/service.schema';
import { users } from '../../../database/src/schema/hospital.schema';
import { eq, desc, or, gte, and, ilike } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { pgTable, uuid, varchar, text, timestamp, boolean, decimal, integer } from 'drizzle-orm/pg-core';

import { labCatalog, labOrders } from '../../../database/src/schema/wizard.schema';
import { logAuditEvent } from '../utils/auditLogger';

// Export for use in other route files
export { labCatalog, labOrders };

const router = Router();


// ===================== LAB CATALOG =====================

// GET /api/lab/catalog
router.get('/catalog', authenticate, async (req: Request, res: Response) => {
    try {
        const catalog = await db.select().from(labCatalog).orderBy(labCatalog.category, labCatalog.testName);
        return res.json({ catalog });
    } catch (err: any) {
        if (err.code === '42P01') return res.json({ catalog: [] });
        console.error('Error fetching lab catalog:', err);
        return res.status(500).json({ error: 'Failed to fetch lab catalog' });
    }
});

// POST /api/lab/catalog — add a new test (admin)
router.post('/catalog', authenticate, requireRole('ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            testCode: z.string().min(1),
            testName: z.string().min(1),
            category: z.string().min(1),
            sampleType: z.string().min(1),
            containerType: z.string().min(1),
            turnaroundHours: z.number().int().positive().optional().default(24),
            price: z.number().nonnegative().optional().default(0),
        });
        const data = schema.parse(req.body);
        const [entry] = await db.insert(labCatalog).values({
            ...data,
            price: data.price.toFixed(2),
        }).returning();
        return res.status(201).json({ message: 'Test added', catalog: entry });
    } catch (err: any) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
        if (err.code === '42P01') return res.status(503).json({ error: 'Lab catalog table not yet initialized' });
        return res.status(500).json({ error: 'Failed to add lab test' });
    }
});

// DELETE /api/lab/catalog/:id
router.delete('/catalog/:id', authenticate, requireRole('ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        await db.delete(labCatalog).where(eq(labCatalog.id, req.params.id));
        return res.json({ message: 'Test removed' });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Lab catalog table not yet initialized' });
        return res.status(500).json({ error: 'Failed to delete lab test' });
    }
});

// ===================== LAB QUEUE =====================

// GET /api/lab/queue — today's lab orders only (work queue for current shift)
router.get('/queue', authenticate, requireRole('ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        // Only show orders created today (current calendar day)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const orders = await db
            .select({
                id: labOrders.id,
                orderNumber: labOrders.orderNumber,
                patientId: labOrders.patientId,
                patientName: patients.fullName,
                gender: patients.gender,
                testName: labCatalog.testName,
                category: labCatalog.category,
                sampleType: labCatalog.sampleType,
                containerType: labCatalog.containerType,
                urgency: labOrders.urgency,
                orderingDoctor: labOrders.orderingDoctorName,
                orderedAt: labOrders.createdAt,
                status: labOrders.status,
                sampleBarcode: labOrders.sampleBarcode,
                collectedAt: labOrders.collectedAt,
                collectorName: labOrders.collectorName,
            })
            .from(labOrders)
            .leftJoin(patients, eq(labOrders.patientId, patients.id))
            .leftJoin(labCatalog, eq(labOrders.testId, labCatalog.id))
            .where(gte(labOrders.createdAt, todayStart))
            .orderBy(desc(labOrders.createdAt));
        return res.json(orders);
    } catch (err: any) {
        if (err.code === '42P01') return res.json([]);
        return res.status(500).json({ error: 'Failed to fetch lab queue' });
    }
});

const testTemplates: Record<string, Array<{ parameterName: string; value: string; unit: string; referenceRange: string; isAbnormal: boolean; isCritical: boolean }>> = {
    'Complete Blood Count (CBC)': [
        { parameterName: 'WBC Count', value: '', unit: 'x10^3/uL', referenceRange: '4.5 - 11.0', isAbnormal: false, isCritical: false },
        { parameterName: 'RBC Count', value: '', unit: 'x10^6/uL', referenceRange: '4.3 - 5.9', isAbnormal: false, isCritical: false },
        { parameterName: 'Hemoglobin (Hb)', value: '', unit: 'g/dL', referenceRange: '13.5 - 17.5', isAbnormal: false, isCritical: false },
        { parameterName: 'Hematocrit (HCT)', value: '', unit: '%', referenceRange: '41.0 - 50.0', isAbnormal: false, isCritical: false },
        { parameterName: 'Platelets', value: '', unit: 'x10^3/uL', referenceRange: '150 - 450', isAbnormal: false, isCritical: false }
    ],
    'Fasting Blood Sugar (FBS)': [
        { parameterName: 'Blood Glucose', value: '', unit: 'mg/dL', referenceRange: '70 - 100', isAbnormal: false, isCritical: false }
    ],
    'Liver Function Test (LFT)': [
        { parameterName: 'ALT (SGPT)', value: '', unit: 'U/L', referenceRange: '7 - 56', isAbnormal: false, isCritical: false },
        { parameterName: 'AST (SGOT)', value: '', unit: 'U/L', referenceRange: '10 - 40', isAbnormal: false, isCritical: false },
        { parameterName: 'Alkaline Phosphatase', value: '', unit: 'U/L', referenceRange: '44 - 147', isAbnormal: false, isCritical: false },
        { parameterName: 'Total Bilirubin', value: '', unit: 'mg/dL', referenceRange: '0.3 - 1.2', isAbnormal: false, isCritical: false },
        { parameterName: 'Direct Bilirubin', value: '', unit: 'mg/dL', referenceRange: '0.0 - 0.3', isAbnormal: false, isCritical: false },
        { parameterName: 'Albumin', value: '', unit: 'g/dL', referenceRange: '3.4 - 5.4', isAbnormal: false, isCritical: false },
        { parameterName: 'Total Protein', value: '', unit: 'g/dL', referenceRange: '6.0 - 8.3', isAbnormal: false, isCritical: false }
    ],
    'Renal Function Test (RFT)': [
        { parameterName: 'Urea', value: '', unit: 'mg/dL', referenceRange: '7 - 20', isAbnormal: false, isCritical: false },
        { parameterName: 'Creatinine', value: '', unit: 'mg/dL', referenceRange: '0.6 - 1.2', isAbnormal: false, isCritical: false },
        { parameterName: 'Uric Acid', value: '', unit: 'mg/dL', referenceRange: '3.5 - 7.2', isAbnormal: false, isCritical: false },
        { parameterName: 'Sodium', value: '', unit: 'mEq/L', referenceRange: '135 - 145', isAbnormal: false, isCritical: false },
        { parameterName: 'Potassium', value: '', unit: 'mEq/L', referenceRange: '3.5 - 5.2', isAbnormal: false, isCritical: false }
    ],
    'Malaria Blood Film': [
        { parameterName: 'Malaria Parasite', value: '', unit: 'Visual', referenceRange: 'Negative', isAbnormal: false, isCritical: false }
    ],
    'Urinalysis': [
        { parameterName: 'pH', value: '', unit: 'pH', referenceRange: '4.6 - 8.0', isAbnormal: false, isCritical: false },
        { parameterName: 'Specific Gravity', value: '', unit: 'SG', referenceRange: '1.005 - 1.030', isAbnormal: false, isCritical: false },
        { parameterName: 'Protein', value: '', unit: 'Qualitative', referenceRange: 'Negative', isAbnormal: false, isCritical: false },
        { parameterName: 'Glucose', value: '', unit: 'Qualitative', referenceRange: 'Negative', isAbnormal: false, isCritical: false },
        { parameterName: 'Ketones', value: '', unit: 'Qualitative', referenceRange: 'Negative', isAbnormal: false, isCritical: false },
        { parameterName: 'Leukocytes', value: '', unit: 'Qualitative', referenceRange: 'Negative', isAbnormal: false, isCritical: false }
    ]
};

// GET /api/lab/orders/:id — get single lab order with results
router.get('/orders/:id', authenticate, requireRole('ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const [order] = await db
            .select({
                id: labOrders.id,
                orderNumber: labOrders.orderNumber,
                patientId: labOrders.patientId,
                patientName: patients.fullName,
                gender: patients.gender,
                dateOfBirth: patients.dateOfBirth,
                testName: labCatalog.testName,
                category: labCatalog.category,
                sampleType: labCatalog.sampleType,
                containerType: labCatalog.containerType,
                urgency: labOrders.urgency,
                orderingDoctor: labOrders.orderingDoctorName,
                orderingDoctorId: labOrders.orderingDoctorId,
                orderedAt: labOrders.createdAt,
                status: labOrders.status,
                sampleBarcode: labOrders.sampleBarcode,
                collectedAt: labOrders.collectedAt,
                collectorName: labOrders.collectorName,
                resultNotes: labOrders.resultNotes,
                verifiedBy: labOrders.verifiedBy,
            })
            .from(labOrders)
            .leftJoin(patients, eq(labOrders.patientId, patients.id))
            .leftJoin(labCatalog, eq(labOrders.testId, labCatalog.id))
            .where(eq(labOrders.id, req.params.id));

        if (!order) return res.status(404).json({ error: 'Lab order not found' });

        // Calculate age
        let age = 0;
        if (order.dateOfBirth) {
            const birthDate = new Date(order.dateOfBirth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }

        // Parse results and technicianNotes from resultNotes column
        let results = testTemplates[order.testName ?? ''] || [];
        let technicianNotes = '';

        if (order.resultNotes) {
            try {
                const parsed = JSON.parse(order.resultNotes);
                if (parsed && Array.isArray(parsed.results)) {
                    results = parsed.results;
                }
                if (parsed && typeof parsed.technicianNotes === 'string') {
                    technicianNotes = parsed.technicianNotes;
                }
            } catch {
                // Not JSON (legacy fallback, treat as technician notes)
                technicianNotes = order.resultNotes;
            }
        }

        return res.json({
            ...order,
            age,
            results,
            technicianNotes,
        });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(404).json({ error: 'Lab orders table not yet initialized' });
        console.error('Failed to fetch lab order:', err);
        return res.status(500).json({ error: 'Failed to fetch lab order' });
    }
});

// POST /api/lab/orders/:id/accept — accept a lab order (LAB_TECHNICIAN, LAB_MANAGER, ADMIN)
router.post('/orders/:id/accept', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const [existing] = await db.select().from(labOrders).where(eq(labOrders.id, req.params.id));
        if (!existing) return res.status(404).json({ error: 'Lab order not found' });

        if (existing.status !== 'ORDERED') {
            return res.status(400).json({ error: `Cannot accept order with status '${existing.status}'. Must be 'ORDERED'.` });
        }

        const [updated] = await db
            .update(labOrders)
            .set({ status: 'ACCEPTED' })
            .where(eq(labOrders.id, req.params.id))
            .returning();

        await logAuditEvent({
            userId: (req.user as any)?.userId || 'unknown',
            userRole: (req.user as any)?.role || 'LAB_TECHNICIAN',
            action: 'LAB_ORDER_ACCEPTED',
            entityType: 'lab_order',
            entityId: req.params.id,
            changes: { after: { status: 'ACCEPTED' } },
            ipAddress: req.ip,
        });

        return res.json({ message: 'Order accepted', order: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Lab orders table not yet initialized' });
        return res.status(500).json({ error: 'Failed to accept order' });
    }
});

// POST /api/lab/orders/:id/reject — reject a lab order (LAB_TECHNICIAN, LAB_MANAGER, ADMIN)
router.post('/orders/:id/reject', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const { reason } = req.body;

        const [existing] = await db.select().from(labOrders).where(eq(labOrders.id, req.params.id));
        if (!existing) return res.status(404).json({ error: 'Lab order not found' });

        if (existing.status === 'REJECTED') {
            return res.status(400).json({ error: 'Order is already rejected.' });
        }

        const [updated] = await db
            .update(labOrders)
            .set({
                status: 'REJECTED',
                resultNotes: reason ? JSON.stringify({ rejectionReason: reason }) : existing.resultNotes,
            })
            .where(eq(labOrders.id, req.params.id))
            .returning();

        await logAuditEvent({
            userId: (req.user as any)?.userId || 'unknown',
            userRole: (req.user as any)?.role || 'LAB_TECHNICIAN',
            action: 'LAB_ORDER_REJECTED',
            entityType: 'lab_order',
            entityId: req.params.id,
            changes: { after: { status: 'REJECTED', reason: reason || 'No reason given' } },
            ipAddress: req.ip,
        });

        return res.json({ message: 'Order rejected', order: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Lab orders table not yet initialized' });
        return res.status(500).json({ error: 'Failed to reject order' });
    }
});

// POST /api/lab/orders/:id/collect-sample — mark sample collected
router.post('/orders/:id/collect-sample', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const { barcode, collectorName } = req.body;
        const [updated] = await db
            .update(labOrders)
            .set({
                status: 'SAMPLE_COLLECTED',
                sampleBarcode: barcode,
                collectorName: collectorName ?? 'Lab Technician',
                collectedAt: new Date(),
            })
            .where(eq(labOrders.id, req.params.id))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Lab order not found' });
        return res.json({ message: 'Sample collected', order: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Lab orders table not yet initialized' });
        return res.status(500).json({ error: 'Failed to update sample collection' });
    }
});

// Save lab findings function
const completeLabOrder = async (req: Request, res: Response) => {
    try {
        const { results, technicianNotes } = req.body;
        const resultNotes = JSON.stringify({ results, technicianNotes });

        const [updated] = await db
            .update(labOrders)
            .set({ status: 'COMPLETED', resultNotes })
            .where(eq(labOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Lab order not found' });
        return res.json({ message: 'Results submitted', order: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Lab orders table not yet initialized' });
        return res.status(500).json({ error: 'Failed to submit results' });
    }
};

// Complete lab order route (Support both POST and PUT)
router.post('/orders/:id/complete', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), completeLabOrder);
router.put('/orders/:id/complete', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), completeLabOrder);

// Verify lab order function
const verifyLabOrder = async (req: Request, res: Response) => {
    try {
        const { results, technicianNotes, verifiedBy } = req.body;
        const resultNotes = JSON.stringify({ results, technicianNotes });
        const verifier = verifiedBy ?? (req.user as any)?.name ?? 'Senior Pathologist';

        const [existingOrder] = await db
            .select()
            .from(labOrders)
            .where(eq(labOrders.id, req.params.id));

        if (!existingOrder) {
            return res.status(404).json({ error: 'Lab order not found' });
        }

        // Enforce state transition: must be in RESULT_ENTERED or COMPLETED to verify
        if (!['RESULT_ENTERED', 'COMPLETED'].includes(existingOrder.status)) {
            return res.status(400).json({
                error: `State Transition Violation: Cannot verify lab order when status is '${existingOrder.status}'. Status must be 'COMPLETED' or 'RESULT_ENTERED' first.`
            });
        }

        const [updated] = await db
            .update(labOrders)
            .set({ 
                status: 'VERIFIED', 
                resultNotes,
                verifiedBy: verifier 
            } as any)
            .where(eq(labOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Lab order not found' });

        // Audit log
        await logAuditEvent({
            userId: (req.user as any)?.userId || 'unknown',
            userRole: (req.user as any)?.role || 'DOCTOR',
            action: 'LAB_RESULT_VERIFIED',
            entityType: 'lab_order',
            entityId: req.params.id,
            changes: { after: { status: 'VERIFIED', verifiedBy: verifier } },
            ipAddress: req.ip,
        });

        return res.json({ message: 'Results verified', order: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Lab orders table not yet initialized' });
        return res.status(500).json({ error: 'Failed to verify results' });
    }
};

// Verify results route (Support both POST and PUT)
router.post('/orders/:id/verify', authenticate, requireRole('ADMIN', 'DOCTOR', 'LAB_MANAGER'), verifyLabOrder);
router.put('/orders/:id/verify', authenticate, requireRole('ADMIN', 'DOCTOR', 'LAB_MANAGER'), verifyLabOrder);



// PATCH /api/lab/orders/:id/status — update order status (ORDERED -> COLLECTED -> IN_PROGRESS)
router.patch('/orders/:id/status', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        if (!['ORDERED', 'COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CRITICAL'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }
        const updateData: Record<string, unknown> = { status };
        if (status === 'COLLECTED') {
            updateData.collectedAt = new Date();
            updateData.collectorName = (req.user as any)?.name ?? 'Lab Technician';
        }
        const [updated] = await db
            .update(labOrders)
            .set(updateData as any)
            .where(eq(labOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Lab order not found' });
        return res.json({ message: 'Status updated', order: updated });
    } catch (err: any) {
        if (err.code === '42P01') return res.status(503).json({ error: 'Lab orders table not yet initialized' });
        console.error('Failed to update lab order status:', err);
        return res.status(500).json({ error: 'Failed to update status' });
    }
});

// POST /api/lab/orders/:id/accept — Accept order
router.post('/orders/:id/accept', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const [updated] = await db
            .update(labOrders)
            .set({ status: 'ACCEPTED' })
            .where(eq(labOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Lab order not found' });
        return res.json({ message: 'Order accepted', order: updated });
    } catch (err: any) {
        return res.status(500).json({ error: 'Failed to accept order' });
    }
});

// POST /api/lab/orders/:id/reject — Reject order
router.post('/orders/:id/reject', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const [updated] = await db
            .update(labOrders)
            .set({ status: 'REJECTED' })
            .where(eq(labOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Lab order not found' });
        return res.json({ message: 'Order rejected', order: updated });
    } catch (err: any) {
        return res.status(500).json({ error: 'Failed to reject order' });
    }
});

// POST /api/lab/orders/:id/start-processing — Start processing test
router.post('/orders/:id/start-processing', authenticate, requireRole('LAB_TECHNICIAN', 'ADMIN', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const [updated] = await db
            .update(labOrders)
            .set({ status: 'PROCESSING' })
            .where(eq(labOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Lab order not found' });
        return res.json({ message: 'Started processing sample', order: updated });
    } catch (err: any) {
        return res.status(500).json({ error: 'Failed to start processing' });
    }
});

// POST /api/lab/orders/:id/review — Doctor reviews verified results
router.post('/orders/:id/review', authenticate, requireRole('DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const [updated] = await db
            .update(labOrders)
            .set({ status: 'RESULT_REVIEWED' })
            .where(eq(labOrders.id, req.params.id))
            .returning();
        if (!updated) return res.status(404).json({ error: 'Lab order not found' });
        return res.json({ message: 'Result marked as reviewed', order: updated });
    } catch (err: any) {
        return res.status(500).json({ error: 'Failed to review results' });
    }
});

export default router;
