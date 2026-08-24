import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { users, roles, departments } from '../../../database/src/schema/hospital.schema';
import { eq } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { logAuditEvent } from '../utils/auditLogger';

const router = Router();

// Protect all routes in this router with Authentication and ADMIN Role requirement
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Zod schemas
const createUserSchema = z.object({
    staffId: z.string().min(3, "Staff ID is required"),
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    roleId: z.string().uuid("Invalid Role ID"),
    departmentId: z.string().uuid("Invalid Department ID").optional(),
});

const updateUserAssignmentSchema = z.object({
    roleId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
});

// 1. GET /api/users/roles - List all roles
router.get('/roles', async (req: Request, res: Response) => {
    try {
        const rolesList = await db.select().from(roles);
        return res.json({ roles: rolesList });
    } catch (error) {
        console.error("Error fetching system roles:", error);
        return res.status(500).json({ error: "Failed to retrieve roles" });
    }
});

// 2. GET /api/users - List all staff
router.get('/', async (req: Request, res: Response) => {
    try {
        const staffList = await db
            .select({
                id: users.id,
                staffId: users.staffId,
                fullName: users.fullName,
                email: users.email,
                phone: users.phone,
                roleId: users.roleId,
                roleName: roles.name,
                departmentId: users.departmentId,
                departmentName: departments.name,
                isActive: users.isActive,
                createdAt: users.createdAt,
            })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .leftJoin(departments, eq(users.departmentId, departments.id));

        return res.json({ users: staffList });
    } catch (error) {
        console.error("Error fetching staff users:", error);
        return res.status(500).json({ error: "Failed to retrieve user directory" });
    }
});

// 2. POST /api/users - Create new staff account
router.post('/', async (req: Request, res: Response) => {
    try {
        const parseResult = createUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parseResult.error.flatten().fieldErrors,
            });
        }

        const { staffId, fullName, email, phone, password, roleId, departmentId } = parseResult.data;

        const existingUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existingUser.length > 0) {
            return res.status(400).json({ error: "A user with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const [newUser] = await db
            .insert(users)
            .values({
                staffId,
                fullName,
                email,
                phone,
                passwordHash,
                roleId,
                departmentId: departmentId || null,
                isActive: true,
            })
            .returning({
                id: users.id,
                staffId: users.staffId,
                fullName: users.fullName,
                email: users.email,
                createdAt: users.createdAt,
            });

        await logAuditEvent({
            userId: (req as any).user?.userId || 'unknown',
            userRole: (req as any).user?.role || 'ADMIN',
            action: 'USER_CREATED',
            entityType: 'user',
            entityId: newUser.id,
            changes: { after: { staffId, fullName, email, roleId } },
            ipAddress: req.ip,
        });

        return res.status(201).json({
            message: "Staff user created successfully",
            user: newUser,
        });
    } catch (error) {
        console.error("Error creating staff account:", error);
        return res.status(500).json({ error: "Failed to create user account" });
    }
});

// 3. PATCH /api/users/:id - Update Role or Status
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const parseResult = updateUserAssignmentSchema.safeParse(req.body);

        if (!parseResult.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parseResult.error.flatten().fieldErrors,
            });
        }

        const [updatedUser] = await db
            .update(users)
            .set({
                ...parseResult.data,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({
                id: users.id,
                staffId: users.staffId,
                fullName: users.fullName,
                roleId: users.roleId,
                departmentId: users.departmentId,
                isActive: users.isActive,
            });

        if (!updatedUser) {
            return res.status(404).json({ error: "Staff user not found" });
        }

        await logAuditEvent({
            userId: (req as any).user?.userId || 'unknown',
            userRole: (req as any).user?.role || 'ADMIN',
            action: 'ROLE_CHANGED',
            entityType: 'user',
            entityId: userId,
            changes: { after: parseResult.data },
            ipAddress: req.ip,
        });

        return res.json({
            message: "Staff assignments updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Error updating staff account:", error);
        return res.status(500).json({ error: "Failed to update user assignments" });
    }
});

export default router;