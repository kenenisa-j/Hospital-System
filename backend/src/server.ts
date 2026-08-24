import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import departmentRoutes from './routes/department.routes';
import patientRoutes from './routes/patient.routes';
import wardRoutes from './routes/ward.routes';
import serviceRoutes from './routes/service.routes';
import analyticsRoutes from './routes/analytics.routes';
import financialAnalyticsRoutes from './routes/financialAnalytics.routes';
import inventoryAnalyticsRoutes from './routes/inventoryAnalytics.routes';
import auditRoutes from './routes/audit.routes';
import billingRoutes, { setIo } from './routes/billing.routes';
// ---- New Routes ----
import visitsRoutes from './routes/visits.routes';
import doctorRoutes from './routes/doctor.routes';
import doctorOverviewRoutes from './routes/doctorOverview.routes';
import labRoutes from './routes/lab.routes';
import radiologyRoutes from './routes/radiology.routes';
import consultationsRoutes from './routes/consultations.routes';
import receptionRoutes from './routes/reception.routes';
import patientHistoryRoutes from './routes/patientHistory.routes';
import pharmacyRoutes from './routes/pharmacy.routes';
import { initSocketEngine } from '../services/socket.service';
import helmet from 'helmet';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { initQueueSocketServer } = require('../sockets/queueSocket.js');

const app = express();
app.use(helmet({
    contentSecurityPolicy: false, // Turn off CSP if frontend might be on a different origin and we are a pure JSON API
}));
const server = http.createServer(app);


// Always allow localhost and 127.0.0.1 on all common dev ports.
// FRONTEND_URL is still honoured for the real production origin.
const localDevOrigins = [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:3001', 'http://127.0.0.1:3001',
    'http://localhost:3002', 'http://127.0.0.1:3002',
    'http://localhost:3003', 'http://127.0.0.1:3003',
];
const allowedOrigins = process.env.FRONTEND_URL
    ? [...new Set([process.env.FRONTEND_URL, ...localDevOrigins])]
    : localDevOrigins;

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
    },
    credentials: true,
};

export const io = new Server(server, { cors: corsOptions });

// Enable CORS for frontend with cookies enabled
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patients', patientHistoryRoutes);   // /api/patients/:id/history
app.use('/api/wards', wardRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics', financialAnalyticsRoutes);
app.use('/api/analytics', inventoryAnalyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/billing', billingRoutes);
// ---- New Routes ----
app.use('/api/visits', visitsRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/doctor', doctorOverviewRoutes);     // /api/doctor/overview
app.use('/api/lab', labRoutes);                   // /api/lab/catalog, /api/lab/queue, /api/lab/orders
app.use('/api/radiology', radiologyRoutes);       // /api/radiology/catalog, /api/radiology/orders
app.use('/api/consultations', consultationsRoutes); // /api/consultations/:visitId
app.use('/api/reception', receptionRoutes);       // /api/reception/daily-summary
app.use('/api/pharmacy', pharmacyRoutes);          // /api/pharmacy/prescriptions

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hospital: 'Abay General Hospital HMS API is running' });
});

// Global Express Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err.statusCode || err.status || 500;
    const response: Record<string, any> = {
        error: err.message || 'Internal Server Error',
    };

    if (process.env.NODE_ENV === 'production') {
        if (statusCode === 500) {
            response.error = 'Internal Server Error';
        }
    } else {
        response.stack = err.stack;
        response.details = err.details || err.message;
    }

    if (statusCode >= 500) {
        console.error(`[Express Error Handler] ${statusCode} - ${err.message || err}`, err.stack);
    } else {
        console.warn(`[Express Error Handler] Client Request Warning: ${statusCode} - ${err.message || err}`);
    }
    
    if (!res.headersSent) {
        res.status(statusCode).json(response);
    }
});

// WebSocket Server — initialise queue socket handlers (join_queue_room etc.)
// queueSocket registers its own event listeners on the server's upgrade path;
// we pass `server` so it can bind, then pass the same `io` to initSocketEngine.
initQueueSocketServer(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Abay HMS Backend running on port ${PORT}`);
    // Supply io instance to billing route so it can emit payment-cleared events
    setIo(io);
    // Wire the notification engine to the SAME io — no second server created
    initSocketEngine(io);
    console.log('[Socket] Notification engine active on shared io instance');
});