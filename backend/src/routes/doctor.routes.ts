import { Router, Request, Response } from 'express';
import { db } from '../../../database/src/db';
import { users, departments, roles } from '../../../database/src/schema/hospital.schema';
import { eq, and, ilike } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/doctors — list active doctors, optionally filter by department name
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { department } = req.query;

        // Find the DOCTOR role
        const [doctorRole] = await db
            .select({ id: roles.id })
            .from(roles)
            .where(ilike(roles.name, 'DOCTOR'));

        if (!doctorRole) {
            return res.json({ doctors: [] });
        }

        let query = db
            .select({
                id: users.id,
                fullName: users.fullName,
                staffId: users.staffId,
                email: users.email,
                departmentId: users.departmentId,
                department: departments.name,
            })
            .from(users)
            .leftJoin(departments, eq(users.departmentId, departments.id))
            .where(and(
                eq(users.roleId, doctorRole.id),
                eq(users.isActive, true)
            ));

        const doctors = await query;

        // Filter by department name if specified
        const filtered = department
            ? doctors.filter(d => {
                const docDept = (d.department || '').toLowerCase();
                const searchDept = (department as string).toLowerCase();
                if (
                    (searchDept === 'general opd' || searchDept === 'outpatient department') &&
                    (docDept === 'general opd' || docDept === 'outpatient department')
                ) {
                    return true;
                }
                return docDept.includes(searchDept);
            })
            : doctors;

        return res.json({
            doctors: filtered.map(d => ({
                id: d.id,
                fullName: d.fullName,
                staffId: d.staffId,
                department: d.department ?? 'General',
            }))
        });
    } catch (err) {
        console.error('Error fetching doctors:', err);
        return res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// GET /api/doctors/:id — get single doctor profile
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const [doctor] = await db
            .select({
                id: users.id,
                fullName: users.fullName,
                staffId: users.staffId,
                email: users.email,
                department: departments.name,
            })
            .from(users)
            .leftJoin(departments, eq(users.departmentId, departments.id))
            .where(eq(users.id, id));

        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
        return res.json({ doctor });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch doctor' });
    }
});

export default router;
