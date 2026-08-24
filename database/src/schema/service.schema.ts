import { pgTable, uuid, varchar, numeric, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { departments } from './hospital.schema';

// Service Classification Categories
export const serviceCategoryEnum = pgEnum('service_category', [
    'CONSULTATION',
    'LABORATORY',
    'RADIOLOGY',
    'PROCEDURE',
    'PHARMACY',
    'NURSING_CARE',
    'ACCOMMODATION',
    'OTHER',
]);

export const services = pgTable('services', {
    id: uuid('id').defaultRandom().primaryKey(),
    departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
    code: varchar('code', { length: 30 }).notNull().unique(), // e.g., "SRV-CONS-001", "LAB-CBC"
    name: varchar('name', { length: 150 }).notNull(), // e.g., "General Practitioner Consultation", "Complete Blood Count"
    category: serviceCategoryEnum('category').notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(), // Standard price in ETB/currency
    description: varchar('description', { length: 255 }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});