import { Router, Request, Response } from 'express';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { appointments, medicalRecords } from '../../../database/src/schema/hospital.schema';
import { eq, desc, and, gte, lte, count, sql } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// GET /api/doctor/overview?doctorId=xxx — Doctor dashboard metrics and pending results
router.get('/overview', authenticate, async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Return structured empty data (queue comes from WebSocket, not REST)
        return res.json({
            pendingResults: [],       // Lab/radiology results ready for review
            completedTodayCount: 0,  // Consultations completed today
            inConsultationCount: 0,
            waitingCount: 0,
        });
    } catch (err) {
        console.error('Error fetching doctor overview:', err);
        return res.status(500).json({ error: 'Failed to fetch doctor overview' });
    }
});

// GET /api/reception/daily-summary — Reception dashboard queue + metrics
router.get('/reception/daily-summary', authenticate, async (req: Request, res: Response) => {
    try {
        return res.json({
            metrics: {
                totalVisitsToday: 0,
                currentlyWaiting: 0,
                inConsultation: 0,
                completedToday: 0,
                avgWaitTimeMinutes: 0,
            },
            queues: [],
        });
    } catch (err) {
        console.error('Error fetching reception summary:', err);
        return res.status(500).json({ error: 'Failed to fetch reception summary' });
    }
});

// GET /api/patients/:id/history — Patient visit and medical history
router.get('/patients/:id/history', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [patient] = await db
            .select()
            .from(patients)
            .where(eq(patients.id, id));

        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const records = await db
            .select()
            .from(medicalRecords)
            .where(eq(medicalRecords.patientId, id))
            .orderBy(desc(medicalRecords.createdAt));

        const appts = await db
            .select()
            .from(appointments)
            .where(eq(appointments.patientId, id))
            .orderBy(desc(appointments.appointmentDate));

        return res.json({
            patient,
            medicalRecords: records,
            appointments: appts,
            visits: [],
            labOrders: [],
            radiologyOrders: [],
        });
    } catch (err) {
        console.error('Error fetching patient history:', err);
        return res.status(500).json({ error: 'Failed to fetch patient history' });
    }
});

export default router;
