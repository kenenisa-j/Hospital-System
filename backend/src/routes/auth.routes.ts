import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { users, roles, departments } from '../../../database/src/schema/hospital.schema';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '../utils/auditLogger';

import { authRateLimiter } from '../middleware/security.middleware';

const router = Router();

// Startup guard: JWT_SECRET must be explicitly set — reject weak/missing secrets in production
const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET || JWT_SECRET === 'abay_default_secret_key') {
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            '[FATAL] JWT_SECRET environment variable is missing or uses the insecure default value. '
            + 'Set a strong random secret before starting the server in production.'
        );
    } else {
        console.warn('[WARN] JWT_SECRET is using the default insecure value. Set a strong secret in production.');
    }
}

// Zod validation schema for login payload
const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email format" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// 1. POST /api/auth/login
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
    try {
        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parseResult.error.flatten().fieldErrors
            });
        }

        const { email, password } = parseResult.data;

        // Fetch user with role and department details
        const userList = await db
            .select({
                id: users.id,
                staffId: users.staffId,
                fullName: users.fullName,
                email: users.email,
                passwordHash: users.passwordHash,
                isActive: users.isActive,
                roleName: roles.name,
                departmentName: departments.name,
            })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .leftJoin(departments, eq(users.departmentId, departments.id))
            .where(eq(users.email, email))
            .limit(1);

        if (userList.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = userList[0];

        if (!user.isActive) {
            return res.status(403).json({ error: "User account is suspended/inactive" });
        }

        // Verify password against stored hash
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Sign JWT Token
        const token = jwt.sign(
            {
                userId: user.id,
                staffId: user.staffId,
                role: user.roleName,
                email: user.email,
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Set secure HTTP-only cookie
        const isLocalhost = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !isLocalhost,
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000, // 8 hours (matches typical hospital shift)
        });

        // Audit: log successful login
        await logAuditEvent({
            userId: user.id,
            userRole: user.roleName || 'UNKNOWN',
            action: 'LOGIN',
            entityType: 'user',
            entityId: user.id,
            changes: { after: { email: user.email, role: user.roleName } },
            ipAddress: req.ip,
        });

        return res.json({
            message: "Login successful",
            user: {
                id: user.id,
                staffId: user.staffId,
                fullName: user.fullName,
                email: user.email,
                role: user.roleName,
                department: user.departmentName || "Unassigned",
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Internal server error during login" });
    }
});

router.post('/logout', (req: Request, res: Response) => {
    const isLocalhost = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && !isLocalhost,
        sameSite: 'lax',
    });
    return res.json({ message: "Logged out successfully" });
});

// 3. GET /api/auth/me (Get current authenticated user session)
router.get('/me', async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            staffId: string;
            role: string;
            email: string;
        };

        const userList = await db
            .select({
                id: users.id,
                staffId: users.staffId,
                fullName: users.fullName,
                email: users.email,
                isActive: users.isActive,
                roleName: roles.name,
                departmentName: departments.name,
            })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .leftJoin(departments, eq(users.departmentId, departments.id))
            .where(eq(users.id, decoded.userId))
            .limit(1);

        if (userList.length === 0 || !userList[0].isActive) {
            return res.status(401).json({ error: "Session invalid or user inactive" });
        }

        const user = userList[0];

        return res.json({
            user: {
                id: user.id,
                staffId: user.staffId,
                fullName: user.fullName,
                email: user.email,
                role: user.roleName,
                department: user.departmentName || "Unassigned",
            },
        });
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token session" });
    }
});


export default router;