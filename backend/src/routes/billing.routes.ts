import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { invoices, invoiceItems, payments, refunds } from '../../../database/src/schema/billing.schema';
import { patients } from '../../../database/src/schema/patient.schema';
import { visits } from '../../../database/src/schema/visits.schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { logAuditEvent } from '../utils/auditLogger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { handlePaymentClearance } = require('../../sockets/queueSocket.js');

// io is set after server initialises to avoid circular dependency
let _io: import('socket.io').Server | null = null;
export function setIo(io: import('socket.io').Server) { _io = io; }

const router = Router();

const createInvoiceSchema = z.object({
    patientId: z.string().uuid(),
    items: z.array(z.object({
        serviceCode: z.string().min(1),
        description: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
    })).min(1),
    notes: z.string().optional(),
});

// GET /api/billing/invoices — List all invoices with patient info
router.get('/invoices', authenticate, requireRole('ADMIN', 'CASHIER', 'RECEPTIONIST'), async (req: Request, res: Response) => {
    try {
        const { q = '', status } = req.query;

        const result = await db
            .select({
                id: invoices.id,
                invoiceNumber: invoices.invoiceNumber,
                patientId: invoices.patientId,
                patientName: patients.fullName,
                mrn: patients.mrn,
                grandTotal: invoices.grandTotal,
                amountPaid: invoices.amountPaid,
                balanceDue: invoices.balanceDue,
                status: invoices.status,
                generatedAt: invoices.generatedAt,
                updatedAt: invoices.updatedAt,
            })
            .from(invoices)
            .leftJoin(patients, eq(invoices.patientId, patients.id))
            .orderBy(desc(invoices.generatedAt));

        return res.json({ invoices: result });
    } catch (err) {
        console.error('Error fetching invoices:', err);
        return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// GET /api/billing/invoices/:id — Get single invoice with items and payments
router.get('/invoices/:id', authenticate, requireRole('ADMIN', 'CASHIER', 'RECEPTIONIST'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [invoice] = await db
            .select({
                id: invoices.id,
                invoiceNumber: invoices.invoiceNumber,
                patientId: invoices.patientId,
                patientName: patients.fullName,
                mrn: patients.mrn,
                grandTotal: invoices.grandTotal,
                amountPaid: invoices.amountPaid,
                balanceDue: invoices.balanceDue,
                status: invoices.status,
                notes: invoices.notes,
                generatedAt: invoices.generatedAt,
            })
            .from(invoices)
            .leftJoin(patients, eq(invoices.patientId, patients.id))
            .where(eq(invoices.id, id));

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        const paymentHistory = await db.select().from(payments).where(eq(payments.invoiceId, id)).orderBy(desc(payments.processedAt));
        const refundHistory = await db.select().from(refunds).where(eq(refunds.invoiceId, id)).orderBy(desc(refunds.processedAt));

        return res.json({ invoice, items, payments: paymentHistory, refunds: refundHistory });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch invoice details' });
    }
});

// POST /api/billing/invoices — Create a new invoice
router.post('/invoices', authenticate, requireRole('ADMIN', 'RECEPTIONIST'), async (req: Request, res: Response) => {
    try {
        const data = createInvoiceSchema.parse(req.body);

        const grandTotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        const [newInvoice] = await db
            .insert(invoices)
            .values({
                invoiceNumber: invNumber,
                patientId: data.patientId,
                grandTotal: grandTotal.toFixed(2),
                balanceDue: grandTotal.toFixed(2),
                notes: data.notes,
            })
            .returning();

        await db.insert(invoiceItems).values(
            data.items.map(item => ({
                invoiceId: newInvoice.id,
                serviceCode: item.serviceCode,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice.toFixed(2),
                lineTotal: (item.quantity * item.unitPrice).toFixed(2),
            }))
        );

        return res.status(201).json({ invoice: newInvoice });
    } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Failed to create invoice' });
    }
});

// POST /api/billing/payments — Process a payment
router.post('/payments', authenticate, requireRole('ADMIN', 'CASHIER', 'RECEPTIONIST'), async (req: Request, res: Response) => {
    try {
        const { invoiceId, amountPaid, paymentMethod, referenceNumber, cashTendered, changeDue, cashierName } = req.body;

        if (!invoiceId || amountPaid === undefined || !paymentMethod || !cashierName) {
            return res.status(400).json({ error: 'invoiceId, amountPaid, paymentMethod, and cashierName are required' });
        }

        // ── P0 FIX: Reject non-positive payment amounts ──────────────────
        const numericAmount = Number(amountPaid);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'amountPaid must be a positive number' });
        }

        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        if (invoice.status === 'PAID') {
            return res.status(409).json({ error: 'Invoice is already fully paid' });
        }

        // ── P0 FIX: Reject payment that exceeds remaining balance ────────
        const currentBalance = parseFloat(invoice.balanceDue);
        if (numericAmount > currentBalance + 0.005) {
            // Allow tiny float rounding slack but reject real overpayments
            return res.status(400).json({ error: `Payment of ${numericAmount} exceeds remaining balance of ${currentBalance.toFixed(2)}` });
        }

        const [payment] = await db.insert(payments).values({
            invoiceId,
            amountPaid: numericAmount.toFixed(2),
            paymentMethod,
            referenceNumber,
            cashTendered: cashTendered ? Number(cashTendered).toFixed(2) : undefined,
            changeDue: changeDue ? Number(changeDue).toFixed(2) : undefined,
            cashierName,
        }).returning();

        // Recalculate invoice balance
        const newAmountPaid = parseFloat(invoice.amountPaid) + numericAmount;
        const newBalance = Math.max(0, parseFloat(invoice.grandTotal) - newAmountPaid);
        const newStatus = newBalance <= 0.005 ? 'PAID' : 'PARTIAL';

        await db.update(invoices).set({
            amountPaid: newAmountPaid.toFixed(2),
            balanceDue: newBalance.toFixed(2),
            status: newStatus,
            updatedAt: new Date(),
        }).where(eq(invoices.id, invoiceId));

        // ── P1 FIX: Sync visit.paymentStatus when invoice is fully PAID ──
        // The invoice notes field may contain "Visit ID: <uuid>" written by charge-slip endpoint.
        // Also look up via patientId for same-day WAITING/PENDING_PAYMENT visits.
        if (newStatus === 'PAID') {
            try {
                // Try to extract visitId from invoice notes
                const visitIdMatch = invoice.notes?.match(/Visit ID:\s*([\w-]+)/);
                if (visitIdMatch) {
                    await db.update(visits)
                        .set({ paymentStatus: 'PAID', updatedAt: new Date() })
                        .where(eq(visits.id, visitIdMatch[1]));
                }
            } catch {
                // Non-fatal: visit sync failure should not block payment
            }
        }

        // ── P0 FIX: Emit real-time queue update with real patient data ───
        if (newStatus === 'PAID' && _io) {
            try {
                // Fetch patient info for the socket payload
                const [patientRow] = await db
                    .select({ fullName: patients.fullName, mrn: patients.mrn })
                    .from(patients)
                    .where(eq(patients.id, invoice.patientId));

                // Find the visit for department + doctor info
                const visitIdMatch = invoice.notes?.match(/Visit ID:\s*([\w-]+)/);
                let visitRow: { id: string; department: string; assignedDoctorId: string | null; triagePriority: string; ticketNumber: string } | undefined;
                if (visitIdMatch) {
                    const [v] = await db
                        .select({
                            id: visits.id,
                            department: visits.department,
                            assignedDoctorId: visits.assignedDoctorId,
                            triagePriority: visits.triagePriority,
                            ticketNumber: visits.ticketNumber,
                        })
                        .from(visits)
                        .where(eq(visits.id, visitIdMatch[1]));
                    visitRow = v;
                }

                await handlePaymentClearance(_io, {
                    id: invoice.id,
                    ticketNumber: visitRow?.ticketNumber ?? invoice.invoiceNumber,
                    patient: {
                        fullName: patientRow?.fullName ?? '',
                        mrn: patientRow?.mrn ?? '',
                    },
                    department: visitRow?.department ?? '',
                    assignedDoctorId: visitRow?.assignedDoctorId ?? null,
                    triagePriority: visitRow?.triagePriority ?? 'NORMAL',
                });
            } catch {
                // Non-fatal: socket emit failure should not block payment response
            }
        }

        // Audit log
        await logAuditEvent({
            userId: req.user?.userId || 'unknown',
            userRole: req.user?.role || 'CASHIER',
            action: 'PAYMENT_RECORDED',
            entityType: 'invoice',
            entityId: invoiceId,
            changes: { after: { amountPaid: numericAmount, newStatus } },
            ipAddress: req.ip,
        });

        return res.status(201).json({ payment });
    } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Failed to process payment' });
    }
});

// GET /api/billing/refunds — List all refunds
router.get('/refunds', authenticate, async (req: Request, res: Response) => {
    try {
        const result = await db
            .select({
                id: refunds.id,
                invoiceId: refunds.invoiceId,
                refundAmount: refunds.refundAmount,
                reason: refunds.reason,
                approvedBy: refunds.approvedBy,
                processedAt: refunds.processedAt,
                patientName: patients.fullName,
                mrn: patients.mrn,
                invoiceNumber: invoices.invoiceNumber,
            })
            .from(refunds)
            .leftJoin(invoices, eq(refunds.invoiceId, invoices.id))
            .leftJoin(patients, eq(invoices.patientId, patients.id))
            .orderBy(desc(refunds.processedAt));
        return res.json({ refunds: result });
    } catch (err) {
        console.error('Error fetching refunds:', err);
        return res.status(500).json({ error: 'Failed to fetch refunds' });
    }
});

// POST /api/billing/refunds — Process a refund
router.post('/refunds', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const { invoiceId, refundAmount, reason, approvedBy } = req.body;

        if (!invoiceId || !refundAmount || !reason || !approvedBy) {
            return res.status(400).json({ error: 'invoiceId, refundAmount, reason, and approvedBy are required' });
        }

        const [refund] = await db.insert(refunds).values({
            invoiceId,
            refundAmount: Number(refundAmount).toFixed(2),
            reason,
            approvedBy,
        }).returning();

        await db.update(invoices).set({
            status: 'REFUNDED',
            updatedAt: new Date(),
        }).where(eq(invoices.id, invoiceId));

        return res.status(201).json({ refund });
    } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Failed to process refund' });
    }
});

// POST /api/billing/charge-slips — Generate charge slip for a visit (initial OPD billing)
router.post('/charge-slips', authenticate, requireRole('ADMIN', 'RECEPTIONIST', 'CASHIER'), async (req: Request, res: Response) => {
    try {
        const { visitId, patientId, paymentType, items, discountAmount, totalAmount, status } = req.body;

        if (!patientId || !items || !items.length) {
            return res.status(400).json({ error: 'patientId and items are required' });
        }

        const invNumber = `CS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`;
        const grandTotal = totalAmount ?? items.reduce((s: number, i: any) => s + (i.amount ?? 0), 0);

        const [newInvoice] = await db
            .insert(invoices)
            .values({
                invoiceNumber: invNumber,
                patientId,
                grandTotal: Number(grandTotal).toFixed(2),
                balanceDue: Number(grandTotal).toFixed(2),
                status: status ?? 'UNPAID',
                notes: visitId ? `Visit ID: ${visitId}` : undefined,
            })
            .returning();

        await db.insert(invoiceItems).values(
            items.map((item: any) => ({
                invoiceId: newInvoice.id,
                serviceCode: item.code ?? 'MISC',
                description: item.description,
                quantity: 1,
                unitPrice: Number(item.amount ?? 0).toFixed(2),
                lineTotal: Number(item.amount ?? 0).toFixed(2),
            }))
        );

        await logAuditEvent({
            userId: (req as any).user?.userId || 'unknown',
            userRole: (req as any).user?.role || 'CASHIER',
            action: 'INVOICE_CREATED',
            entityType: 'invoice',
            entityId: newInvoice.id,
            changes: { after: { invoiceNumber: newInvoice.invoiceNumber, grandTotal: grandTotal, patientId } },
            ipAddress: req.ip,
        });

        return res.status(201).json({
            message: 'Charge slip generated',
            invoiceNumber: newInvoice.invoiceNumber,
            invoice: newInvoice,
        });
    } catch (err: any) {
        console.error('Error creating charge slip:', err);
        return res.status(400).json({ error: err.message || 'Failed to create charge slip' });
    }
});

export default router;
