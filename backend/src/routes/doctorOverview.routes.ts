import { Router, Request, Response } from 'express';
import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { departments, users } from '../../../database/src/schema/hospital.schema';
import { visits } from '../../../database/src/schema/visits.schema';
import { labCatalog, labOrders, radiologyCatalog, radiologyOrders } from '../../../database/src/schema/wizard.schema';
import { authenticate } from '../middleware/auth.middleware';
import { eq, desc, and, or, gte, inArray } from 'drizzle-orm';

const router = Router();

// GET /api/doctor/queue?department=General OPD
// Returns all WAITING and IN_CONSULTATION visits for the given department (shown to doctor)
router.get('/queue', authenticate, async (req: Request, res: Response) => {
    try {
        const { department } = req.query;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Normalize department query to search for both General OPD and Outpatient Department
        let deptFilter = undefined;
        if (department) {
            const searchDept = (department as string).toLowerCase();
            if (searchDept === 'general opd' || searchDept === 'outpatient department') {
                deptFilter = or(
                    eq(visits.department, 'General OPD'),
                    eq(visits.department, 'Outpatient Department')
                );
            } else {
                deptFilter = eq(visits.department, department as string);
            }
        }

        const conditions = [
            gte(visits.createdAt, startOfDay)
        ];
        if (deptFilter) {
            conditions.push(deptFilter);
        }

        const result = await db
            .select({
                id: visits.id,
                ticketNumber: visits.ticketNumber,
                patientName: patients.fullName,
                patientMrn: patients.mrn,
                department: visits.department,
                assignedDoctorId: visits.assignedDoctorId,
                status: visits.status,
                triagePriority: visits.triagePriority,
                chiefComplaint: visits.chiefComplaint,
                arrivalTime: visits.createdAt,
                paymentStatus: visits.paymentStatus,
                paymentType: visits.paymentType,
            })
            .from(visits)
            .leftJoin(patients, eq(visits.patientId, patients.id))
            .where(and(...conditions))
            .orderBy(desc(visits.createdAt));

        // Show all WAITING and IN_CONSULTATION visits to the doctor.
        // Payment is a cashier concern handled separately after consultation.
        const activeQueue = result
            .filter(v => v.status === 'WAITING' || v.status === 'IN_CONSULTATION')
            .map(v => ({
                id: v.id,
                ticketNumber: v.ticketNumber,
                patientName: v.patientName ?? 'Unknown Patient',
                patientMrn: v.patientMrn ?? '-',
                department: v.department,
                assignedDoctorId: v.assignedDoctorId,
                status: v.status,
                triagePriority: v.triagePriority,
                chiefComplaint: v.chiefComplaint ?? '',
                arrivalTime: v.arrivalTime
                    ? new Date(v.arrivalTime).toISOString()
                    : new Date().toISOString(),
            }));

        return res.json({ queue: activeQueue });
    } catch (err: any) {
        if (err.code === '42P01') return res.json({ queue: [] });
        console.error('Error fetching doctor queue:', err);
        return res.status(500).json({ error: 'Failed to fetch doctor queue' });
    }
});

// GET /api/doctor/overview?doctorId=xxx
// Returns pending lab/radiology results (COMPLETED or CRITICAL) and queue counters for this doctor's department
router.get('/overview', authenticate, async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.query;

        let completedTodayCount = 0;
        let inConsultationCount = 0;
        let waitingCount = 0;
        const pendingResults: object[] = [];

        if (doctorId) {
            try {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                // 1. Get the doctor's department name
                const [docUser] = await db
                    .select({ deptName: departments.name })
                    .from(users)
                    .leftJoin(departments, eq(users.departmentId, departments.id))
                    .where(eq(users.id, doctorId as string))
                    .limit(1);

                const docDept = docUser?.deptName;

                // 2. Query today's visits in this department
                let deptFilter = undefined;
                if (docDept) {
                    const searchDept = docDept.toLowerCase();
                    if (searchDept === 'general opd' || searchDept === 'outpatient department') {
                        deptFilter = or(
                            eq(visits.department, 'General OPD'),
                            eq(visits.department, 'Outpatient Department')
                        );
                    } else {
                        deptFilter = eq(visits.department, docDept);
                    }
                }

                const conditions = [gte(visits.createdAt, startOfDay)];
                if (deptFilter) {
                    conditions.push(deptFilter);
                }

                const deptVisits = await db
                    .select({ status: visits.status, patientId: visits.patientId, id: visits.id })
                    .from(visits)
                    .where(and(...conditions));

                completedTodayCount = deptVisits.filter(v => v.status === 'COMPLETED').length;
                inConsultationCount = deptVisits.filter(v => v.status === 'IN_CONSULTATION').length;
                waitingCount = deptVisits.filter(v => v.status === 'WAITING').length;

                // 3. Get unique patient IDs from today's department visits
                const patientIds = [...new Set(deptVisits.map(v => v.patientId).filter(Boolean))] as string[];

                let pendingLabCount = 0;
                let pendingRadCount = 0;

                if (patientIds.length > 0) {
                    // Count pending lab tests (active workflow: not yet verified or reviewed)
                    const activeLabOrders = await db
                        .select({ id: labOrders.id })
                        .from(labOrders)
                        .where(and(
                            inArray(labOrders.patientId, patientIds),
                            inArray(labOrders.status, ['ORDERED', 'ACCEPTED', 'SAMPLE_COLLECTED', 'PROCESSING', 'RESULT_ENTERED'])
                        ));
                    pendingLabCount = activeLabOrders.length;

                    // Count pending radiology exams (active workflow: not yet verified or completed)
                    const activeRadOrders = await db
                        .select({ id: radiologyOrders.id })
                        .from(radiologyOrders)
                        .where(and(
                            inArray(radiologyOrders.patientId, patientIds),
                            inArray(radiologyOrders.status, ['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
                        ));
                    pendingRadCount = activeRadOrders.length;

                    // 4. Fetch verified/critical lab results awaiting review
                    const verifiedLabOrders = await db
                        .select({
                            id: labOrders.id,
                            orderNumber: labOrders.orderNumber,
                            patientId: labOrders.patientId,
                            patientName: patients.fullName,
                            patientMrn: patients.mrn,
                            testName: labCatalog.testName,
                            status: labOrders.status,
                            orderedAt: labOrders.createdAt,
                        })
                        .from(labOrders)
                        .leftJoin(patients, eq(labOrders.patientId, patients.id))
                        .leftJoin(labCatalog, eq(labOrders.testId, labCatalog.id))
                        .where(and(
                            inArray(labOrders.patientId, patientIds),
                            inArray(labOrders.status, ['RESULT_ENTERED', 'COMPLETED', 'VERIFIED', 'CRITICAL'])
                        ))
                        .orderBy(desc(labOrders.createdAt));

                    verifiedLabOrders.forEach(order => {
                        pendingResults.push({
                            id: order.id,
                            patientName: order.patientName ?? 'Unknown',
                            patientMrn: order.patientMrn ?? '-',
                            type: 'LAB',
                            testName: order.testName ?? order.orderNumber,
                            requestedAt: order.orderedAt?.toISOString() ?? new Date().toISOString(),
                            status: order.status === 'CRITICAL' ? 'CRITICAL' : 'READY',
                        });
                    });

                    // 5. Fetch verified radiology orders for these patients
                    const verifiedRadOrders = await db
                        .select({
                            id: radiologyOrders.id,
                            orderNumber: radiologyOrders.orderNumber,
                            patientId: radiologyOrders.patientId,
                            patientName: patients.fullName,
                            patientMrn: patients.mrn,
                            examName: radiologyCatalog.examName,
                            status: radiologyOrders.status,
                            orderedAt: radiologyOrders.createdAt,
                        })
                        .from(radiologyOrders)
                        .leftJoin(patients, eq(radiologyOrders.patientId, patients.id))
                        .leftJoin(radiologyCatalog, eq(radiologyOrders.examId, radiologyCatalog.id))
                        .where(and(
                            inArray(radiologyOrders.patientId, patientIds),
                            eq(radiologyOrders.status, 'VERIFIED')
                        ))
                        .orderBy(desc(radiologyOrders.createdAt));

                    verifiedRadOrders.forEach(order => {
                        pendingResults.push({
                            id: order.id,
                            patientName: order.patientName ?? 'Unknown',
                            patientMrn: order.patientMrn ?? '-',
                            type: 'RADIOLOGY',
                            testName: order.examName ?? order.orderNumber,
                            requestedAt: order.orderedAt?.toISOString() ?? new Date().toISOString(),
                            status: 'READY',
                        });
                    });
                }

                return res.json({
                    pendingResults,
                    completedTodayCount,
                    inConsultationCount,
                    waitingCount,
                    pendingLabCount,
                    pendingRadCount,
                });
            } catch (innerErr: any) {
                console.error('Error fetching doctor overview detail:', innerErr);
            }
        }

        return res.json({
            pendingResults,
            completedTodayCount,
            inConsultationCount,
            waitingCount,
            pendingLabCount: 0,
            pendingRadCount: 0,
        });
    } catch (err) {
        console.error('Error fetching doctor overview:', err);
        return res.status(500).json({ error: 'Failed to fetch doctor overview' });
    }
});

export default router;

