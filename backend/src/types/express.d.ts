import { Request } from 'express';

export interface AuthenticatedUser {
    userId: string;
    staffId: string;
    role: string;
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}