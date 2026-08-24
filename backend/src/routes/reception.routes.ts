import { Router, Request, Response } from 'express';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { users } from '../../../database/src/schema/hospital.schema';
import { visits } from '../../../database/src/schema/visits.schema';
import { eq, desc, and, gte, sql, count } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/reception/daily-summary — live queue + metrics for reception dashboard
router.get('/daily-summary', authenticate, async (req: Request, res: Response) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Get all visits today with patient + doctor info
        const todayVisits = await db
            .select({
                id: visits.id,
                ticketNumber: visits.ticketNumber,
                patientName: patients.fullName,
                patientMrn: patients.mrn,
                patientPhone: patients.phoneNumber,
                department: visits.department,
                assignedDoctor: users.fullName,
                status: visits.status,
                arrivalTime: visits.createdAt,
                triagePriority: visits.triagePriority,
            })
            .from(visits)
            .leftJoin(patients, eq(visits.patientId, patients.id))
            .leftJoin(users, eq(visits.assignedDoctorId, users.id))
            .where(gte(visits.createdAt, startOfDay))
            .orderBy(desc(visits.createdAt));

        const totalVisitsToday = todayVisits.length;
        const currentlyWaiting = todayVisits.filter(v => v.status === 'WAITING').length;
        const inConsultation = todayVisits.filter(v => v.status === 'IN_CONSULTATION').length;
        const completedToday = todayVisits.filter(v => v.status === 'COMPLETED').length;

        const queues = todayVisits.map(v => {
            const arrived = new Date(v.arrivalTime!);
            const waitTimeMinutes = Math.floor((Date.now() - arrived.getTime()) / 60000);
            return {
                ...v,
                arrivalTime: arrived.toISOString(),
                waitTimeMinutes: Math.max(0, waitTimeMinutes),
            };
        });

        return res.json({
            metrics: {
                totalVisitsToday,
                currentlyWaiting,
                inConsultation,
                completedToday,
                avgWaitTimeMinutes: queues.length
                    ? Math.round(queues.reduce((a, v) => a + v.waitTimeMinutes, 0) / queues.length)
                    : 0,
            },
            queues,
        });
    } catch (err: any) {
        if (err.code === '42P01') {
            // Visits table doesn't exist yet — return empty but valid shape
            return res.json({
                metrics: { totalVisitsToday: 0, currentlyWaiting: 0, inConsultation: 0, completedToday: 0, avgWaitTimeMinutes: 0 },
                queues: [],
            });
        }
        console.error('Error fetching reception daily summary:', err);
        return res.status(500).json({ error: 'Failed to fetch reception summary' });
    }
});

export default router;
