import { db } from '../../../database/src/db';
import { patients } from '../../../database/src/schema/patient.schema';
import { like, desc } from 'drizzle-orm';

/**
 * Generates a unique, standardized, sequential Patient MRN.
 * Format: ABAY-PT-YYYY-XXXXX (e.g., ABAY-PT-2026-00001)
 */
export async function generatePatientMRN(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `ABAY-PT-${currentYear}-`;

    // Query the latest patient registered in the current year
    const [latestPatient] = await db
        .select({ mrn: patients.mrn })
        .from(patients)
        .where(like(patients.mrn, `${prefix}%`))
        .orderBy(desc(patients.createdAt))
        .limit(1);

    let sequenceNumber = 1;

    if (latestPatient && latestPatient.mrn) {
        const parts = latestPatient.mrn.split('-');
        const lastSeqStr = parts[parts.length - 1];

        if (lastSeqStr && !isNaN(parseInt(lastSeqStr, 10))) {
            sequenceNumber = parseInt(lastSeqStr, 10) + 1;
        }
    }

    // Zero-pad to 5 digits (00001, 00002, ..., 99999)
    const paddedSequence = String(sequenceNumber).padStart(5, '0');

    return `${prefix}${paddedSequence}`;
}