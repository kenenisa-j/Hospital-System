import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    boolean,
    primaryKey,
    decimal,
    integer,
    pgEnum
} from 'drizzle-orm/pg-core';
import { patients } from './patient.schema';

// 1. DEPARTMENTS TABLE
export const departments = pgTable('departments', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(), // e.g. "OPD", "Emergency", "Pharmacy"
    code: varchar('code', { length: 20 }).notNull().unique(), // e.g. "DEP-OPD", "DEP-PHARM"
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. ROLES TABLE
export const roles = pgTable('roles', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 50 }).notNull().unique(), // e.g. "DOCTOR", "RECEPTIONIST"
    description: text('description'),
    isSystemRole: boolean('is_system_role').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. PERMISSIONS TABLE
export const permissions = pgTable('permissions', {
    id: uuid('id').defaultRandom().primaryKey(),
    action: varchar('action', { length: 100 }).notNull().unique(), // e.g. "patient:create", "invoice:pay"
    module: varchar('module', { length: 50 }).notNull(), // e.g. "RECEPTION", "BILLING", "CLINICAL"
    description: text('description'),
});

// 4. ROLE-PERMISSIONS JUNCTION TABLE
export const rolePermissions = pgTable('role_permissions', {
    roleId: uuid('role_id')
        .references(() => roles.id, { onDelete: 'cascade' })
        .notNull(),
    permissionId: uuid('permission_id')
        .references(() => permissions.id, { onDelete: 'cascade' })
        .notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));

// 5. USERS TABLE (Hospital Staff Accounts)
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    staffId: varchar('staff_id', { length: 50 }).notNull().unique(), // e.g. "ABAY-STF-001"
    fullName: varchar('full_name', { length: 150 }).notNull(),
    email: varchar('email', { length: 150 }).notNull().unique(),
    phone: varchar('phone', { length: 30 }),
    passwordHash: text('password_hash').notNull(),
    roleId: uuid('role_id')
        .references(() => roles.id)
        .notNull(),
    departmentId: uuid('department_id')
        .references(() => departments.id),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


// Nurse Patient Tasks
export const nurseTasks = pgTable("nurse_tasks", {
    id: uuid("id").primaryKey().defaultRandom(),
    admissionId: uuid("admission_id").references(() => admissions.id).notNull(),
    title: text("title").notNull(),
    type: text("type").notNull(), // VITAL_CHECK, MEDICATION, LAB_DRAW, DRESSING_CHANGE
    priority: text("priority").default("ROUTINE"), // ROUTINE, URGENT, HIGH
    isCompleted: boolean("is_completed").default(false),
    dueAt: timestamp("due_at").notNull(),
    completedAt: timestamp("completed_at"),
    completedBy: text("completed_by"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Medication Administration Record (MAR)
export const medicationSchedules = pgTable("medication_schedules", {
    id: uuid("id").primaryKey().defaultRandom(),
    admissionId: uuid("admission_id").references(() => admissions.id).notNull(),
    medicationName: text("medication_name").notNull(),
    dosage: text("dosage").notNull(), // e.g. "500mg"
    route: text("route").notNull(), // Oral, IV, IM, SC
    scheduledTime: timestamp("scheduled_time").notNull(),
    status: text("status").default("PENDING"), // PENDING, ADMINISTERED, SKIPPED
    administeredBy: text("administered_by"),
    administeredAt: timestamp("administered_at"),
    notes: text("notes"),
});


export const vitalSigns = pgTable("vital_signs", {
    id: uuid("id").primaryKey().defaultRandom(),
    admissionId: uuid("admission_id").references(() => admissions.id).notNull(),

    // Clinical Parameters
    temperature: decimal("temperature", { precision: 4, scale: 1 }), // °C
    systolicBp: integer("systolic_bp"),                             // mmHg
    diastolicBp: integer("diastolic_bp"),                            // mmHg
    pulse: integer("pulse"),                                         // bpm
    respiratoryRate: integer("respiratory_rate"),                   // bpm
    spo2: integer("spo2"),                                           // %

    recordedBy: text("recorded_by").notNull(),                       // Nurse/Staff Name or ID
    recordedAt: timestamp("recorded_at").defaultNow(),
});


export const nursingNotes = pgTable("nursing_notes", {
    id: uuid("id").primaryKey().defaultRandom(),
    admissionId: uuid("admission_id").references(() => admissions.id).notNull(),

    shiftType: text("shift_type").notNull(), // DAY, NIGHT, OVERTIME
    category: text("category").notNull(),   // GENERAL_OBSERVATION, POST_OP_CARE, MEDICATION_RESPONSE, CLINICAL_DECLINE
    noteContent: text("note_content").notNull(),
    patientCondition: text("patient_condition").default("STABLE"), // STABLE, IMPROVING, CRITICAL, GUARDED

    nurseId: text("nurse_id").notNull(),
    nurseName: text("nurse_name").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

export const medicationAdministrations = pgTable("medication_administrations", {
    id: uuid("id").primaryKey().defaultRandom(),
    admissionId: uuid("admission_id").references(() => admissions.id).notNull(),
    prescriptionItemId: uuid("prescription_item_id").notNull(), // Connects to pharmacy dispensed item

    medicationName: text("medication_name").notNull(),
    dosageGiven: text("dosage_given").notNull(),
    route: text("route").notNull(), // Oral, IV, IM, SC, Topical

    status: text("status").notNull(), // ADMINISTERED, REFUSED, HELD, SKIPPED
    reasonForHoldOrRefusal: text("reason_for_hold_or_refusal"),

    administeredBy: text("administered_by").notNull(), // Nurse ID/Name
    administeredAt: timestamp("administered_at").defaultNow(),
    notes: text("notes"),
});

export const bedStatusEnum = pgEnum('bed_status', [
    'AVAILABLE',
    'OCCUPIED',
    'MAINTENANCE',
    'RESERVED',
    'CLEANING',
]);

// 11. WARDS TABLE
export const wards = pgTable('wards', {
    id: uuid('id').defaultRandom().primaryKey(),
    departmentId: uuid('department_id')
        .references(() => departments.id, { onDelete: 'cascade' })
        .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    floor: integer('floor').default(1).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. ROOMS TABLE
export const rooms = pgTable('rooms', {
    id: uuid('id').defaultRandom().primaryKey(),
    wardId: uuid('ward_id')
        .references(() => wards.id, { onDelete: 'cascade' })
        .notNull(),
    roomNumber: varchar('room_number', { length: 30 }).notNull(),
    roomType: varchar('room_type', { length: 50 }).notNull(), // e.g. General, Private, Semi-Private
    capacity: integer('capacity').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 13. BEDS TABLE
export const beds = pgTable('beds', {
    id: uuid('id').defaultRandom().primaryKey(),
    roomId: uuid('room_id')
        .references(() => rooms.id, { onDelete: 'cascade' }),
    wardId: uuid('ward_id')
        .references(() => wards.id, { onDelete: 'cascade' })
        .notNull(),
    bedNumber: varchar('bed_number', { length: 30 }).notNull(),
    status: bedStatusEnum('status').default('AVAILABLE').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 14. ADMISSIONS TABLE
export const admissions = pgTable('admissions', {
    id: uuid('id').defaultRandom().primaryKey(),
    patientId: uuid('patient_id')
        .references(() => patients.id, { onDelete: 'cascade' })
        .notNull(),
    bedId: uuid('bed_id')
        .references(() => beds.id, { onDelete: 'cascade' })
        .notNull(),
    reason: text('reason').notNull(),
    doctorNotes: text('doctor_notes'),
    status: varchar('status', { length: 30 }).default('ACTIVE').notNull(), // ACTIVE, DISCHARGED
    admittedAt: timestamp('admitted_at').defaultNow().notNull(),
    dischargedAt: timestamp('discharged_at'),
});

// 15. BED TRANSFER LOGS TABLE
export const bedTransferLogs = pgTable('bed_transfer_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    patientId: uuid('patient_id')
        .references(() => patients.id, { onDelete: 'cascade' })
        .notNull(),
    fromBedId: uuid('from_bed_id')
        .references(() => beds.id),
    toBedId: uuid('to_bed_id')
        .references(() => beds.id),
    reason: text('reason').notNull(),
    authorizedBy: text('authorized_by').notNull(),
    transferredAt: timestamp('transferred_at').defaultNow().notNull(),
});

// 16. APPOINTMENTS TABLE
export const appointments = pgTable('appointments', {
    id: uuid('id').defaultRandom().primaryKey(),
    patientId: uuid('patient_id')
        .references(() => patients.id, { onDelete: 'cascade' })
        .notNull(),
    departmentId: uuid('department_id')
        .references(() => departments.id)
        .notNull(),
    appointmentDate: timestamp('appointment_date').notNull(),
    status: varchar('status', { length: 30 }).default('SCHEDULED').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 17. MEDICAL RECORDS TABLE
export const medicalRecords = pgTable('medical_records', {
    id: uuid('id').defaultRandom().primaryKey(),
    patientId: uuid('patient_id')
        .references(() => patients.id, { onDelete: 'cascade' })
        .notNull(),
    primaryDiagnosis: text('primary_diagnosis').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});



// 20. INVENTORY TABLE
export const inventory = pgTable('inventory', {
    id: uuid('id').defaultRandom().primaryKey(),
    itemName: varchar('item_name', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    totalStock: integer('total_stock').default(0).notNull(),
    reorderLevel: integer('reorder_level').default(10).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 21. BATCHES TABLE
export const batches = pgTable('batches', {
    id: uuid('id').defaultRandom().primaryKey(),
    batchNumber: varchar('batch_number', { length: 100 }).notNull(),
    inventoryId: uuid('inventory_id')
        .references(() => inventory.id, { onDelete: 'cascade' })
        .notNull(),
    currentQuantity: integer('current_quantity').default(0).notNull(),
    expiryDate: timestamp('expiry_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});