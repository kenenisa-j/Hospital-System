import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { ZodSchema, ZodError } from "zod";

// 1. API Rate Limiter
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});

// 2. Strict Rate Limiter for Authentication Endpoints
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Limit each IP to 5 failed login attempts
    skipSuccessfulRequests: true,
    message: { error: "Too many authentication attempts. Account temporarily locked for 15 minutes." },
});

// 3. Generic Zod Validation Middleware
export const validateBody = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    error: "Validation error",
                    details: error.errors.map((err) => ({
                        field: err.path.join("."),
                        message: err.message,
                    })),
                });
            }
            return res.status(400).json({ error: "Invalid payload input" });
        }
    };
};