import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '../types/express';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error(
        '[FATAL] JWT_SECRET environment variable is not set. ' +
        'Set a strong random key before starting the server.'
    );
}

// 1. Authenticate Middleware (Verifies session cookie)
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies?.token;

        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: "Access denied: No authentication token provided" });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired session token" });
    }
};

// 2. Role Enforcement Middleware (e.g. requireRole('ADMIN', 'DOCTOR'))
export const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User session missing" });
        }

        // DEBUG: log role check (remove after diagnosing 403 issue)
        console.log(`[requireRole] user.role="${req.user.role}" allowed=[${allowedRoles.join(', ')}] match=${allowedRoles.includes(req.user.role)} path=${req.method} ${req.originalUrl}`);

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]`
            });
        }

        next();
    };
};