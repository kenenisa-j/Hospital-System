import { pgTable, uuid, varchar, text, timestamp, json, integer, decimal, boolean, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema';
import { users } from './hospital.schema';

// 1. Consultations Table
export const consultations = pgTable('consultations', {
    id: uuid('id').defaultRandom().primaryKey(),
    visitId: varchar('visit_id', { length: 100 }).notNull().unique(),
    patientId: uuid('patient_id').references(() => patients.id).notNull(),
    doctorId: uuid('doctor_id').references(() => users.id),
    vitals: json('vitals'),
    clinicalNotes: json('clinical_notes'),
    status: varchar('status', { length: 30 }).notNull().default('OPEN'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        visitIdIdx: index('consultations_visit_id_idx').on(table.visitId),
        patientIdIdx: index('consultations_patient_id_idx').on(table.patientId),
        doctorIdIdx: index('consultations_doctor_id_idx').on(table.doctorId),
    };
});

// 2. Diagnoses Table
export const diagnoses = pgTable('diagnoses', {
    id: uuid('id').defaultRandom().primaryKey(),
    visitId: varchar('visit_id', { length: 100 }).notNull(),
    icdCode: varchar('icd_code', { length: 20 }),
    description: text('description').notNull(),
    type: varchar('type', { length: 20 }).notNull().default('PRIMARY'), // PRIMARY, SECONDARY, DIFFERENTIAL
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        visitIdIdx: index('diagnoses_visit_id_idx').on(table.visitId),
    };
});

// 3. Clinical Orders Table
export const clinicalOrders = pgTable('clinical_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    visitId: varchar('visit_id', { length: 100 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // LAB, RADIOLOGY, PRESCRIPTION
    testName: varchar('test_name', { length: 200 }).notNull(),
    urgency: varchar('urgency', { length: 20 }).notNull().default('ROUTINE'),
    notes: text('notes'),
    status: varchar('status', { length: 30 }).notNull().default('ORDERED'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        visitIdIdx: index('clinical_orders_visit_id_idx').on(table.visitId),
    };
});

// 4. Lab Catalog Table
export const labCatalog = pgTable('lab_catalog', {
    id: uuid('id').defaultRandom().primaryKey(),
    testCode: varchar('test_code', { length: 30 }).notNull().unique(),
    testName: varchar('test_name', { length: 150 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    sampleType: varchar('sample_type', { length: 100 }).notNull(),
    containerType: varchar('container_type', { length: 100 }).notNull(),
    turnaroundHours: integer('turnaround_hours').notNull().default(24),
    price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Lab Orders Table
export const labOrders = pgTable('lab_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    patientId: uuid('patient_id').references(() => patients.id).notNull(),
    testId: uuid('test_id').references(() => labCatalog.id).notNull(),
    urgency: varchar('urgency', { length: 20 }).notNull().default('ROUTINE'),
    orderingDoctorId: uuid('ordering_doctor_id').references(() => users.id),
    orderingDoctorName: varchar('ordering_doctor_name', { length: 150 }),
    status: varchar('status', { length: 30 }).notNull().default('ORDERED'),
    sampleBarcode: varchar('sample_barcode', { length: 100 }),
    collectedAt: timestamp('collected_at', { withTimezone: true }),
    collectorName: varchar('collector_name', { length: 150 }),
    resultNotes: text('result_notes'),
    verifiedBy: varchar('verified_by', { length: 150 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        patientIdIdx: index('lab_orders_patient_id_idx').on(table.patientId),
        testIdIdx: index('lab_orders_test_id_idx').on(table.testId),
        statusIdx: index('lab_orders_status_idx').on(table.status),
    };
});

// 6. Radiology Catalog Table
export const radiologyCatalog = pgTable('radiology_catalog', {
    id: uuid('id').defaultRandom().primaryKey(),
    examCode: varchar('exam_code', { length: 30 }).notNull().unique(),
    examName: varchar('exam_name', { length: 150 }).notNull(),
    modality: varchar('modality', { length: 50 }).notNull(), // X-RAY, CT, MRI, ULTRASOUND, etc.
    bodyPart: varchar('body_part', { length: 100 }),
    preparationInstructions: text('preparation_instructions'),
    durationMinutes: integer('duration_minutes').default(30),
    price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Radiology Orders Table
export const radiologyOrders = pgTable('radiology_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    patientId: uuid('patient_id').references(() => patients.id).notNull(),
    examId: uuid('exam_id').references(() => radiologyCatalog.id).notNull(),
    urgency: varchar('urgency', { length: 20 }).notNull().default('ROUTINE'),
    orderingDoctorName: varchar('ordering_doctor_name', { length: 150 }),
    orderingDoctorId: uuid('ordering_doctor_id').references(() => users.id),
    clinicalNotes: text('clinical_notes'),
    status: varchar('status', { length: 30 }).notNull().default('ORDERED'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    findings: text('findings'),
    impression: text('impression'),
    radiologistName: varchar('radiologist_name', { length: 150 }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        patientIdIdx: index('radiology_orders_patient_id_idx').on(table.patientId),
        examIdIdx: index('radiology_orders_exam_id_idx').on(table.examId),
        statusIdx: index('radiology_orders_status_idx').on(table.status),
    };
});

// 8. Prescriptions Table (Doctor → Pharmacy)
export const prescriptions = pgTable('prescriptions', {
    id: uuid('id').defaultRandom().primaryKey(),
    rxNumber: varchar('rx_number', { length: 50 }).notNull().unique(), // e.g. RX-2026-00123
    visitId: varchar('visit_id', { length: 100 }).notNull(),
    patientId: uuid('patient_id').references(() => patients.id).notNull(),
    doctorId: uuid('doctor_id').references(() => users.id),
    doctorName: varchar('doctor_name', { length: 150 }),
    clinicalNotes: text('clinical_notes'),
    status: varchar('status', { length: 30 }).notNull().default('PENDING'),
    // PENDING → DISPENSED / PARTIALLY_DISPENSED / REJECTED
    dispensedAt: timestamp('dispensed_at', { withTimezone: true }),
    dispensedBy: varchar('dispensed_by', { length: 150 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        visitIdIdx: index('prescriptions_visit_id_idx').on(table.visitId),
        patientIdIdx: index('prescriptions_patient_id_idx').on(table.patientId),
        statusIdx: index('prescriptions_status_idx').on(table.status),
    };
});

// 9. Prescription Items Table (individual medication lines)
export const prescriptionItems = pgTable('prescription_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    prescriptionId: uuid('prescription_id').references(() => prescriptions.id, { onDelete: 'cascade' }).notNull(),
    medicationName: varchar('medication_name', { length: 200 }).notNull(),
    strength: varchar('strength', { length: 100 }), // e.g. "500mg"
    dosage: varchar('dosage', { length: 100 }),       // e.g. "1 tablet"
    frequency: varchar('frequency', { length: 100 }), // e.g. "Twice daily"
    duration: varchar('duration', { length: 100 }),   // e.g. "7 days"
    route: varchar('route', { length: 50 }).default('Oral'), // Oral, IV, IM, Topical
    quantity: integer('quantity').default(1),
    instructions: text('instructions'),              // "Take after food"
    status: varchar('status', { length: 30 }).notNull().default('PENDING'),
    // PENDING → DISPENSED / UNAVAILABLE
    dispensedAt: timestamp('dispensed_at', { withTimezone: true }),
    dispensedBy: varchar('dispensed_by', { length: 150 }),
    unavailableReason: text('unavailable_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        prescriptionIdIdx: index('prescription_items_prescription_id_idx').on(table.prescriptionId),
    };
});