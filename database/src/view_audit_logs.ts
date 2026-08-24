import { db } from './db';
import { visits } from './schema/visits.schema';
import { patients } from './schema/patient.schema';
import { eq, desc } from 'drizzle-orm';

async function run() {
    const result = await db
        .select({
            ticketNumber: visits.ticketNumber,
            department: visits.department,
            status: visits.status,
            paymentStatus: visits.paymentStatus,
            paymentType: visits.paymentType,
            triagePriority: visits.triagePriority,
            patientName: patients.fullName,
        })
        .from(visits)
        .leftJoin(patients, eq(visits.patientId, patients.id))
        .orderBy(desc(visits.createdAt))
        .limit(10);

    console.log('Recent Visits:');
    for (const v of result) {
        console.log(`[${v.ticketNumber}] ${v.patientName} | Dept: ${v.department} | Status: ${v.status} | PayStatus: ${v.paymentStatus} | PayType: ${v.paymentType} | Priority: ${v.triagePriority}`);
    }
}

run().catch(console.error);
