import { db } from "../db";
import { appointments, medicalRecords, departments } from "../schema/hospital.schema";
import { sql, eq, and, gte, lte, count, desc } from "drizzle-orm";

// Fetch overall daily and monthly patient volume trends
export async function getPatientVolumeStats(startDate: Date, endDate: Date) {
    return await db
        .select({
            date: sql<string>`DATE(${appointments.appointmentDate})`,
            totalPatients: count(appointments.id),
        })
        .from(appointments)
        .where(and(
            gte(appointments.appointmentDate, startDate),
            lte(appointments.appointmentDate, endDate)
        ))
        .groupBy(sql`DATE(${appointments.appointmentDate})`)
        .orderBy(sql`DATE(${appointments.appointmentDate})`);
}

// Fetch top common diagnoses
export async function getTopDiagnoses(limit = 5) {
    return await db
        .select({
            diagnosis: medicalRecords.primaryDiagnosis,
            totalCases: count(medicalRecords.id),
        })
        .from(medicalRecords)
        .groupBy(medicalRecords.primaryDiagnosis)
        .orderBy(desc(count(medicalRecords.id)))
        .limit(limit);
}

// Fetch departmental volume breakdown
export async function getDepartmentBreakdown() {
    return await db
        .select({
            departmentName: departments.name,
            patientCount: count(appointments.id),
        })
        .from(appointments)
        .leftJoin(departments, eq(appointments.departmentId, departments.id))
        .groupBy(departments.name)
        .orderBy(desc(count(appointments.id)));
}