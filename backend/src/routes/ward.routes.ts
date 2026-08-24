import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../../database/src/db';
import { 
    wards, 
    rooms, 
    beds, 
    vitalSigns, 
    nursingNotes, 
    medicationAdministrations, 
    admissions, 
    bedTransferLogs 
} from '../../../database/src/schema/hospital.schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Validation Schemas
const createWardSchema = z.object({
    departmentId: z.string().uuid(),
    name: z.string().min(2),
    code: z.string().min(2),
    floor: z.number().int(),
});

const createRoomSchema = z.object({
    wardId: z.string().uuid(),
    roomNumber: z.string().min(1),
    roomType: z.string().min(2),
    capacity: z.number().int().min(1),
});

const createBedSchema = z.object({
    wardId: z.string().uuid(),
    roomId: z.string().uuid().optional(),
    bedNumber: z.string().min(1),
});

const createAdmissionSchema = z.object({
    patientId: z.string().uuid(),
    bedId: z.string().uuid(),
    reason: z.string().min(3),
    doctorNotes: z.string().optional(),
});

const updateBedStatusSchema = z.object({
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE']),
});

const transferPatientSchema = z.object({
    admissionId: z.string().uuid(),
    patientId: z.string().uuid(),
    fromBedId: z.string().uuid(),
    toBedId: z.string().uuid(),
    reason: z.string().min(3),
    authorizedBy: z.string().min(2),
});

// ==========================================
// PUBLIC / CLINICAL ROUTES (DOCTOR & NURSE)
// ==========================================

// Fetch full hierarchy: Wards -> Rooms -> Beds
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const allWards = await db.select().from(wards).orderBy(desc(wards.createdAt));
        const allRooms = await db.select().from(rooms);
        const allBeds = await db.select().from(beds);

        const structured = allWards.map((w) => ({
            ...w,
            rooms: allRooms
                .filter((r) => r.wardId === w.id)
                .map((r) => ({
                    ...r,
                    beds: allBeds.filter((b) => b.roomId === r.id),
                })),
        }));

        return res.json({ wards: structured });
    } catch (error) {
        console.error("Error fetching ward hierarchy:", error);
        return res.status(500).json({ error: "Failed to retrieve wards layout" });
    }
});

import { patients } from '../../../database/src/schema/patient.schema';

// GET /api/wards/admissions — List all active patient admissions
router.get('/admissions', authenticate, async (req: Request, res: Response) => {
    try {
        const list = await db
            .select({
                id: admissions.id,
                patientId: admissions.patientId,
                patientName: patients.fullName,
                mrn: patients.mrn,
                bedId: admissions.bedId,
                bedNumber: beds.bedNumber,
                reason: admissions.reason,
                doctorNotes: admissions.doctorNotes,
                status: admissions.status,
                admittedAt: admissions.admittedAt,
            })
            .from(admissions)
            .leftJoin(patients, eq(admissions.patientId, patients.id))
            .leftJoin(beds, eq(admissions.bedId, beds.id))
            .where(eq(admissions.status, 'ACTIVE'))
            .orderBy(desc(admissions.admittedAt));

        return res.json({ admissions: list });
    } catch (error) {
        console.error("Error fetching admissions list:", error);
        return res.status(500).json({ error: "Failed to retrieve admissions" });
    }
});

// Step 11.1: Create Doctor Admission Order
router.post('/admissions', authenticate, requireRole('DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const data = createAdmissionSchema.parse(req.body);

        const result = await db.transaction(async (tx) => {
            // 1. Verify target bed availability
            const targetBed = await tx.select().from(beds).where(eq(beds.id, data.bedId)).limit(1);
            if (!targetBed.length || targetBed[0].status !== 'AVAILABLE') {
                throw new Error('Selected bed is not available for admission.');
            }

            // 2. Mark bed as OCCUPIED
            await tx.update(beds)
                .set({ status: 'OCCUPIED' })
                .where(eq(beds.id, data.bedId));

            // 3. Create active admission record
            const [newAdmission] = await tx.insert(admissions)
                .values({
                    patientId: data.patientId,
                    bedId: data.bedId,
                    reason: data.reason,
                    doctorNotes: data.doctorNotes,
                    status: 'ACTIVE',
                    admittedAt: new Date(),
                })
                .returning();

            return newAdmission;
        });

        return res.status(201).json({ admission: result });
    } catch (error: any) {
        console.error("Error creating admission order:", error);
        return res.status(400).json({ error: error.message || "Failed to process admission" });
    }
});

// Step 11.2: Update Bed Status (Available, Occupied, Reserved, Cleaning, Maintenance)
router.patch('/beds/:id/status', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = updateBedStatusSchema.parse(req.body);

        const [updatedBed] = await db.update(beds)
            .set({ status })
            .where(eq(beds.id, id))
            .returning();

        if (!updatedBed) {
            return res.status(404).json({ error: "Bed not found" });
        }

        return res.json({ bed: updatedBed });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Invalid status update" });
    }
});

// Step 11.3: Transfer Patient with Full Audit Trail
router.post('/transfer', authenticate, async (req: Request, res: Response) => {
    try {
        const data = transferPatientSchema.parse(req.body);

        await db.transaction(async (tx) => {
            // 1. Mark source bed as CLEANING
            await tx.update(beds)
                .set({ status: "CLEANING" })
                .where(eq(beds.id, data.fromBedId));

            // 2. Mark destination bed as OCCUPIED
            await tx.update(beds)
                .set({ status: "OCCUPIED" })
                .where(eq(beds.id, data.toBedId));

            // 3. Update the patient's active admission record with the new bed ID
            await tx.update(admissions)
                .set({ bedId: data.toBedId })
                .where(eq(admissions.id, data.admissionId));

            // 4. Create immutable audit log entry
            await tx.insert(bedTransferLogs).values({
                patientId: data.patientId,
                fromBedId: data.fromBedId,
                toBedId: data.toBedId,
                reason: data.reason,
                authorizedBy: data.authorizedBy,
                transferredAt: new Date(),
            });
        });

        return res.status(200).json({
            success: true,
            message: "Patient transfer completed and audit log recorded.",
        });
    } catch (error: any) {
        console.error("Error executing bed transfer:", error);
        return res.status(400).json({ error: error.message || "Failed to complete transfer" });
    }
});

// ==========================================
// ADMIN-ONLY SETUP ROUTES
// ==========================================
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Create Ward
router.post('/', async (req: Request, res: Response) => {
    try {
        const data = createWardSchema.parse(req.body);
        const [newWard] = await db
            .insert(wards)
            .values({ ...data, code: data.code.toUpperCase() })
            .returning();
        return res.status(201).json({ ward: newWard });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Invalid payload" });
    }
});

// Create Room under Ward
router.post('/rooms', async (req: Request, res: Response) => {
    try {
        const data = createRoomSchema.parse(req.body);
        const [newRoom] = await db.insert(rooms).values(data).returning();
        return res.status(201).json({ room: newRoom });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Invalid payload" });
    }
});

// Create Bed under Room
router.post('/beds', async (req: Request, res: Response) => {
    try {
        const data = createBedSchema.parse(req.body);
        const [newBed] = await db.insert(beds).values(data).returning();
        return res.status(201).json({ bed: newBed });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Invalid payload" });
    }
});



const createVitalSignSchema = z.object({
    admissionId: z.string().uuid(),
    temperature: z.number().optional(),
    systolicBp: z.number().int().optional(),
    diastolicBp: z.number().int().optional(),
    pulse: z.number().int().optional(),
    respiratoryRate: z.number().int().optional(),
    spo2: z.number().int().optional(),
    recordedBy: z.string().min(2),
});

// POST /api/wards/vitals — Record Vitals Log
router.post('/vitals', authenticate, requireRole('NURSE', 'DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const data = createVitalSignSchema.parse(req.body);

        const [newLog] = await db.insert(vitalSigns).values({
            ...data,
            temperature: data.temperature ? data.temperature.toString() : undefined,
        }).returning();

        return res.status(201).json({ vitalSign: newLog });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Invalid vitals data" });
    }
});

// GET /api/wards/vitals/:admissionId — Fetch Recent Vitals Log
router.get('/vitals/:admissionId', authenticate, async (req: Request, res: Response) => {
    try {
        const { admissionId } = req.params;

        const history = await db.select()
            .from(vitalSigns)
            .where(eq(vitalSigns.admissionId, admissionId))
            .orderBy(desc(vitalSigns.recordedAt))
            .limit(5);

        return res.json({ history });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch patient vitals history" });
    }
});

const createNursingNoteSchema = z.object({
    admissionId: z.string().uuid(),
    shiftType: z.enum(['DAY', 'NIGHT', 'OVERTIME']),
    category: z.enum(['GENERAL_OBSERVATION', 'POST_OP_CARE', 'MEDICATION_RESPONSE', 'CLINICAL_DECLINE']),
    noteContent: z.string().min(10, "Note must be at least 10 characters long"),
    patientCondition: z.enum(['STABLE', 'IMPROVING', 'CRITICAL', 'GUARDED']),
    nurseId: z.string().min(1),
    nurseName: z.string().min(2),
});

// POST /api/wards/notes — Submit Nursing Observation Note
router.post('/notes', authenticate, requireRole('NURSE', 'DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const data = createNursingNoteSchema.parse(req.body);

        const [newNote] = await db.insert(nursingNotes).values(data).returning();

        return res.status(201).json({ note: newNote });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Invalid note data" });
    }
});

// GET /api/wards/notes/:admissionId — Retrieve Patient Observation Timeline
router.get('/notes/:admissionId', authenticate, async (req: Request, res: Response) => {
    try {
        const { admissionId } = req.params;

        const notes = await db.select()
            .from(nursingNotes)
            .where(eq(nursingNotes.admissionId, admissionId))
            .orderBy(desc(nursingNotes.createdAt));

        return res.json({ notes });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch nursing notes history" });
    }
});

const executeMedicationSchema = z.object({
    admissionId: z.string().uuid(),
    prescriptionItemId: z.string().uuid(),
    medicationName: z.string().min(1),
    dosageGiven: z.string().min(1),
    route: z.string().min(1),
    status: z.enum(['ADMINISTERED', 'REFUSED', 'HELD', 'SKIPPED']),
    reasonForHoldOrRefusal: z.string().optional(),
    administeredBy: z.string().min(2),
    notes: z.string().optional(),
});

// POST /api/wards/medications/execute — Log Medication Administration
router.post('/medications/execute', authenticate, requireRole('NURSE', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const data = executeMedicationSchema.parse(req.body);

        const [record] = await db.insert(medicationAdministrations).values({
            ...data,
            administeredAt: new Date(),
        }).returning();

        return res.status(201).json({ record });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Invalid administration record" });
    }
});

// GET /api/wards/medications/history/:admissionId — Fetch Administration Audit Log
router.get('/medications/history/:admissionId', authenticate, async (req: Request, res: Response) => {
    try {
        const { admissionId } = req.params;

        const history = await db.select()
            .from(medicationAdministrations)
            .where(eq(medicationAdministrations.admissionId, admissionId))
            .orderBy(desc(medicationAdministrations.administeredAt));

        return res.json({ history });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch medication execution log" });
    }
});

export default router;