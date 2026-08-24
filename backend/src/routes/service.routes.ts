import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { services } from '../../../database/src/schema/service.schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

const createServiceSchema = z.object({
    departmentId: z.string().uuid().optional(),
    code: z.string().min(2),
    name: z.string().min(2),
    category: z.enum([
        'CONSULTATION',
        'LABORATORY',
        'RADIOLOGY',
        'PROCEDURE',
        'PHARMACY',
        'NURSING_CARE',
        'ACCOMMODATION',
        'OTHER',
    ]),
    unitPrice: z.number().positive(),
    description: z.string().optional(),
});

// GET /api/services — List active catalog services for all authenticated staff
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const serviceList = await db
            .select()
            .from(services)
            .orderBy(desc(services.createdAt));

        return res.json({ services: serviceList });
    } catch (error) {
        console.error("Error fetching services catalog:", error);
        return res.status(500).json({ error: "Failed to retrieve service catalog" });
    }
});

// Admin-Only Catalog Management
router.use(authenticate);
router.use(requireRole('ADMIN'));

// POST /api/services — Create a new billable service
router.post('/', async (req: Request, res: Response) => {
    try {
        const data = createServiceSchema.parse(req.body);
        const [newService] = await db
            .insert(services)
            .values({
                ...data,
                code: data.code.toUpperCase(),
                unitPrice: data.unitPrice.toFixed(2),
            })
            .returning();

        return res.status(201).json({ service: newService });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Invalid payload" });
    }
});

// PATCH /api/services/:id — Update price or active status
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { unitPrice, isActive, name, description } = req.body;

        const [updatedService] = await db
            .update(services)
            .set({
                ...(unitPrice !== undefined && { unitPrice: Number(unitPrice).toFixed(2) }),
                ...(isActive !== undefined && { isActive }),
                ...(name && { name }),
                ...(description && { description }),
                updatedAt: new Date(),
            })
            .where(eq(services.id, id))
            .returning();

        return res.json({ service: updatedService });
    } catch (error) {
        return res.status(500).json({ error: "Failed to update service item" });
    }
});

export default router;