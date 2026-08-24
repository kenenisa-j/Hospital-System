import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { departments } from '../../../database/src/schema/hospital.schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Zod Validation Schemas
const createDepartmentSchema = z.object({
    name: z.string().min(2, "Department name must be at least 2 characters"),
    code: z.string().min(2, "Department code must be at least 2 characters"),
    description: z.string().optional(),
});

const updateDepartmentSchema = z.object({
    name: z.string().min(2).optional(),
    code: z.string().min(2).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
});

// GET /api/departments - Public for authenticated staff (for dropdowns, triage selection)
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const list = await db
            .select()
            .from(departments)
            .orderBy(desc(departments.createdAt));

        return res.json({ departments: list });
    } catch (error) {
        console.error("Error fetching departments:", error);
        return res.status(500).json({ error: "Failed to retrieve departments" });
    }
});

// Protect write operations strictly for ADMIN
router.use(authenticate);
router.use(requireRole('ADMIN'));

// POST /api/departments - Create Department
router.post('/', async (req: Request, res: Response) => {
    try {
        const parseResult = createDepartmentSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parseResult.error.flatten().fieldErrors,
            });
        }

        const { name, code, description } = parseResult.data;

        const [newDept] = await db
            .insert(departments)
            .values({
                name,
                code: code.toUpperCase(),
                description: description || null,
                isActive: true,
            })
            .returning();

        return res.status(201).json({
            message: "Department created successfully",
            department: newDept,
        });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ error: "Department name or code already exists" });
        }
        console.error("Error creating department:", error);
        return res.status(500).json({ error: "Failed to create department" });
    }
});

// PATCH /api/departments/:id - Edit or Disable Department
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const parseResult = updateDepartmentSchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parseResult.error.flatten().fieldErrors,
            });
        }

        const [updatedDept] = await db
            .update(departments)
            .set({
                ...parseResult.data,
                updatedAt: new Date(),
            })
            .where(eq(departments.id, id))
            .returning();

        if (!updatedDept) {
            return res.status(404).json({ error: "Department not found" });
        }

        return res.json({
            message: "Department updated successfully",
            department: updatedDept,
        });
    } catch (error) {
        console.error("Error updating department:", error);
        return res.status(500).json({ error: "Failed to update department" });
    }
});

export default router;