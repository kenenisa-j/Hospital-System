import { pgTable, uuid, varchar, text, date, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);
export const bloodGroupEnum = pgEnum('blood_group', [
    'A_POSITIVE',
    'A_NEGATIVE',
    'B_POSITIVE',
    'B_NEGATIVE',
    'AB_POSITIVE',
    'AB_NEGATIVE',
    'O_POSITIVE',
    'O_NEGATIVE',
    'UNKNOWN',
]);

export const patients = pgTable('patients', {
    id: uuid('id').defaultRandom().primaryKey(),
    mrn: varchar('mrn', { length: 30 }).notNull().unique(), // e.g., "ABAY-PT-2026-00001"
    fullName: varchar('full_name', { length: 150 }).notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    gender: genderEnum('gender').notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    address: text('address').notNull(),

    // Emergency Contact Details
    emergencyContactName: varchar('emergency_contact_name', { length: 150 }).notNull(),
    emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }).notNull(),
    emergencyContactRelation: varchar('emergency_contact_relation', { length: 50 }).notNull(),

    // Baseline Clinical Profiles
    bloodGroup: bloodGroupEnum('blood_group').default('UNKNOWN').notNull(),
    knownAllergies: text('known_allergies'), // Comma-separated or text notes

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
    return {
        fullNameIdx: index('patients_full_name_idx').on(table.fullName),
        mrnIdx: index('patients_mrn_idx').on(table.mrn),
        phoneNumberIdx: index('patients_phone_number_idx').on(table.phoneNumber),
        createdAtIdx: index('patients_created_at_idx').on(table.createdAt),
    };
});