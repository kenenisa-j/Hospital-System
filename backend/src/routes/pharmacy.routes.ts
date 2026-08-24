import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { prescriptions, prescriptionItems } from '../../../database/src/schema/wizard.schema';
import { patients } from '../../../database/src/schema/patient.schema';
import { users, inventory, batches } from '../../../database/src/schema/hospital.schema';
import { eq, desc, and, sql, asc, gt } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { logAuditEvent } from '../utils/auditLogger';

const router = Router();

// ─────────────────────────────────────────────────────────────────────
// POST /api/pharmacy/prescriptions — Doctor creates prescription
// ─────────────────────────────────────────────────────────────────────
router.post('/prescriptions', authenticate, requireRole('DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            visitId: z.string().min(1),
            patientId: z.string().uuid(),
            clinicalNotes: z.string().optional(),
            items: z.array(z.object({
                medicationName: z.string().min(1),
                strength: z.string().optional(),
                dosage: z.string().optional(),
                frequency: z.string().optional(),
                duration: z.string().optional(),
                route: z.string().optional().default('Oral'),
                quantity: z.number().int().positive().optional().default(1),
                instructions: z.string().optional(),
            })).min(1),
        });

        const data = schema.parse(req.body);
        const doctorId = (req as any).user?.userId;
        const doctorName = (req as any).user?.fullName || 'Unknown Doctor';

        // Generate RX number
        const count = await db.select({ count: sql<number>`count(*)` }).from(prescriptions);
        const num = (Number(count[0]?.count) || 0) + 1;
        const rxNumber = `RX-${new Date().getFullYear()}-${String(num).padStart(5, '0')}`;

        // Create prescription header
        const [rx] = await db.insert(prescriptions).values({
            rxNumber,
            visitId: data.visitId,
            patientId: data.patientId,
            doctorId,
            doctorName,
            clinicalNotes: data.clinicalNotes || null,
            status: 'PENDING',
        }).returning();

        // Create prescription line items
        const itemRows = data.items.map(item => ({
            prescriptionId: rx.id,
            medicationName: item.medicationName,
            strength: item.strength || null,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            route: item.route || 'Oral',
            quantity: item.quantity || 1,
            instructions: item.instructions || null,
            status: 'PENDING' as const,
        }));

        const items = await db.insert(prescriptionItems).values(itemRows).returning();

        return res.status(201).json({
            message: 'Prescription created',
            prescription: { ...rx, items },
        });
    } catch (err: any) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
        console.error('Error creating prescription:', err);
        return res.status(500).json({ error: 'Failed to create prescription' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/pharmacy/prescriptions — List all prescriptions for pharmacy
// ─────────────────────────────────────────────────────────────────────
router.get('/prescriptions', authenticate, requireRole('PHARMACIST', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        let query = db
            .select({
                id: prescriptions.id,
                rxNumber: prescriptions.rxNumber,
                visitId: prescriptions.visitId,
                patientId: prescriptions.patientId,
                patientName: patients.fullName,
                mrn: patients.mrn,
                doctorName: prescriptions.doctorName,
                clinicalNotes: prescriptions.clinicalNotes,
                status: prescriptions.status,
                dispensedAt: prescriptions.dispensedAt,
                dispensedBy: prescriptions.dispensedBy,
                createdAt: prescriptions.createdAt,
            })
            .from(prescriptions)
            .leftJoin(patients, eq(prescriptions.patientId, patients.id))
            .orderBy(desc(prescriptions.createdAt));

        const result = await query;

        // Filter by status if provided
        const filtered = status
            ? result.filter(r => r.status === String(status).toUpperCase())
            : result;

        return res.json({ prescriptions: filtered });
    } catch (err) {
        console.error('Error fetching prescriptions:', err);
        return res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/pharmacy/prescriptions/:id — Get single prescription with items
// ─────────────────────────────────────────────────────────────────────
router.get('/prescriptions/:id', authenticate, requireRole('PHARMACIST', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_MANAGER'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [rx] = await db
            .select({
                id: prescriptions.id,
                rxNumber: prescriptions.rxNumber,
                visitId: prescriptions.visitId,
                patientId: prescriptions.patientId,
                patientName: patients.fullName,
                mrn: patients.mrn,
                patientDob: patients.dateOfBirth,
                patientGender: patients.gender,
                patientPhone: patients.phoneNumber,
                doctorName: prescriptions.doctorName,
                clinicalNotes: prescriptions.clinicalNotes,
                status: prescriptions.status,
                dispensedAt: prescriptions.dispensedAt,
                dispensedBy: prescriptions.dispensedBy,
                createdAt: prescriptions.createdAt,
            })
            .from(prescriptions)
            .leftJoin(patients, eq(prescriptions.patientId, patients.id))
            .where(eq(prescriptions.id, id));

        if (!rx) return res.status(404).json({ error: 'Prescription not found' });

        const items = await db
            .select()
            .from(prescriptionItems)
            .where(eq(prescriptionItems.prescriptionId, id))
            .orderBy(prescriptionItems.createdAt);

        return res.json({ prescription: { ...rx, items } });
    } catch (err) {
        console.error('Error fetching prescription:', err);
        return res.status(500).json({ error: 'Failed to fetch prescription' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/pharmacy/prescriptions/:id/dispense — Dispense all items
// with full inventory check + stock deduction (FIFO batches)
// ─────────────────────────────────────────────────────────────────────
router.patch('/prescriptions/:id/dispense', authenticate, requireRole('PHARMACIST', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const dispensedBy = (req as any).user?.fullName || (req as any).user?.name || 'Pharmacist';

        // ── P0 FIX: Run entire dispense inside a DB transaction ────────────
        const result = await db.transaction(async (tx) => {
            // 1. Fetch prescription and guard against re-dispensing
            const [rx] = await tx
                .select()
                .from(prescriptions)
                .where(eq(prescriptions.id, id));

            if (!rx) {
                throw Object.assign(new Error('Prescription not found'), { statusCode: 404 });
            }
            if (rx.status === 'DISPENSED') {
                throw Object.assign(new Error('Prescription has already been dispensed'), { statusCode: 409 });
            }
            if (rx.status === 'CANCELLED' || rx.status === 'REJECTED') {
                throw Object.assign(new Error('Cannot dispense a cancelled or rejected prescription'), { statusCode: 409 });
            }

            // 2. Fetch pending items
            const items = await tx
                .select()
                .from(prescriptionItems)
                .where(and(
                    eq(prescriptionItems.prescriptionId, id),
                    eq(prescriptionItems.status, 'PENDING'),
                ));

            if (items.length === 0) {
                throw Object.assign(new Error('No pending items to dispense'), { statusCode: 400 });
            }

            // 3. For each item, verify stock and perform FIFO batch deduction
            for (const item of items) {
                const qty = item.quantity ?? 1;

                // Find matching inventory item by name (case-insensitive)
                const [invItem] = await tx
                    .select()
                    .from(inventory)
                    .where(sql`lower(${inventory.itemName}) = lower(${item.medicationName})`);

                if (!invItem) {
                    // Item not tracked in inventory — allow dispensing (may be a non-stocked item)
                    continue;
                }

                if (invItem.totalStock < qty) {
                    throw Object.assign(
                        new Error(`Insufficient stock for '${item.medicationName}': available ${invItem.totalStock}, required ${qty}`),
                        { statusCode: 409 }
                    );
                }

                // FIFO deduction from batches (earliest expiry first, with remaining qty > 0)
                const batchList = await tx
                    .select()
                    .from(batches)
                    .where(and(
                        eq(batches.inventoryId, invItem.id),
                        gt(batches.currentQuantity, 0),
                    ))
                    .orderBy(asc(batches.expiryDate));

                let remaining = qty;
                for (const batch of batchList) {
                    if (remaining <= 0) break;
                    const deduct = Math.min(batch.currentQuantity, remaining);
                    await tx
                        .update(batches)
                        .set({
                            currentQuantity: batch.currentQuantity - deduct,
                            updatedAt: new Date(),
                        })
                        .where(eq(batches.id, batch.id));
                    remaining -= deduct;
                }

                // Update inventory total stock
                await tx
                    .update(inventory)
                    .set({
                        totalStock: invItem.totalStock - qty,
                        updatedAt: new Date(),
                    })
                    .where(eq(inventory.id, invItem.id));

                // Audit inventory change (outside tx — use after commit)
                // We record this outside the transaction below
            }

            // 4. Mark all pending items as DISPENSED
            await tx
                .update(prescriptionItems)
                .set({
                    status: 'DISPENSED',
                    dispensedAt: new Date(),
                    dispensedBy,
                })
                .where(and(
                    eq(prescriptionItems.prescriptionId, id),
                    eq(prescriptionItems.status, 'PENDING'),
                ));

            // 5. Mark prescription as DISPENSED
            const [updatedRx] = await tx
                .update(prescriptions)
                .set({
                    status: 'DISPENSED',
                    dispensedAt: new Date(),
                    dispensedBy,
                    updatedAt: new Date(),
                })
                .where(eq(prescriptions.id, id))
                .returning();

            return updatedRx;
        });

        // Audit log (outside transaction — non-fatal)
        await logAuditEvent({
            userId: (req as any).user?.userId || 'unknown',
            userRole: (req as any).user?.role || 'PHARMACIST',
            action: 'PRESCRIPTION_DISPENSED',
            entityType: 'prescription',
            entityId: id,
            changes: { after: { status: 'DISPENSED', dispensedBy } },
            ipAddress: req.ip,
        });

        // Audit inventory change
        await logAuditEvent({
            userId: (req as any).user?.userId || 'unknown',
            userRole: (req as any).user?.role || 'PHARMACIST',
            action: 'INVENTORY_CHANGED',
            entityType: 'inventory',
            entityId: id,
            changes: { after: { prescriptionId: id, reason: 'DISPENSED', dispensedBy } },
            ipAddress: req.ip,
        });

        return res.json({ message: 'Prescription dispensed', prescription: result });
    } catch (err: any) {
        const statusCode = err.statusCode || 500;
        if (statusCode >= 500) {
            console.error('Error dispensing prescription:', err);
        } else {
            console.warn(`[Client Error] Pharmacy Dispense: ${err.message}`);
        }
        return res.status(statusCode).json({ error: err.message || 'Failed to dispense prescription' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// PATCH /api/pharmacy/prescriptions/:id/items/:itemId/unavailable
// ─────────────────────────────────────────────────────────────────────
router.patch('/prescriptions/:id/items/:itemId/unavailable', authenticate, requireRole('PHARMACIST', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { id, itemId } = req.params;
        const { reason } = req.body;

        await db
            .update(prescriptionItems)
            .set({
                status: 'UNAVAILABLE',
                unavailableReason: reason || 'Out of stock',
            })
            .where(and(
                eq(prescriptionItems.id, itemId),
                eq(prescriptionItems.prescriptionId, id),
            ));

        // Check if all items are now handled (dispensed or unavailable)
        const allItems = await db
            .select({ status: prescriptionItems.status })
            .from(prescriptionItems)
            .where(eq(prescriptionItems.prescriptionId, id));

        const allHandled = allItems.every(i => i.status !== 'PENDING');
        const anyDispensed = allItems.some(i => i.status === 'DISPENSED');

        if (allHandled) {
            await db.update(prescriptions).set({
                status: anyDispensed ? 'PARTIALLY_DISPENSED' : 'REJECTED',
                updatedAt: new Date(),
            }).where(eq(prescriptions.id, id));
        }

        return res.json({ message: 'Item marked as unavailable' });
    } catch (err) {
        console.error('Error marking item unavailable:', err);
        return res.status(500).json({ error: 'Failed to update item' });
    }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/pharmacy/summary — Dashboard stats
// ─────────────────────────────────────────────────────────────────────
router.get('/summary', authenticate, async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allPrescriptions = await db.select({ status: prescriptions.status, createdAt: prescriptions.createdAt }).from(prescriptions);

        const pending = allPrescriptions.filter(p => p.status === 'PENDING').length;
        const dispensedToday = allPrescriptions.filter(p =>
            p.status === 'DISPENSED' && p.createdAt && new Date(p.createdAt) >= today
        ).length;
        const totalToday = allPrescriptions.filter(p =>
            p.createdAt && new Date(p.createdAt) >= today
        ).length;

        return res.json({
            pending,
            dispensedToday,
            totalToday,
            rejected: allPrescriptions.filter(p => p.status === 'REJECTED').length,
            partiallyDispensed: allPrescriptions.filter(p => p.status === 'PARTIALLY_DISPENSED').length,
        });
    } catch (err) {
        console.error('Error fetching pharmacy summary:', err);
        return res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

export default router;
