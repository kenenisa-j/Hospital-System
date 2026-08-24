import { pgTable, uuid, varchar, decimal, integer, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema';

// ============================
// INVOICES TABLE
// ============================
export const invoices = pgTable('invoices', {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
    patientId: uuid('patient_id').references(() => patients.id).notNull(),
    grandTotal: decimal('grand_total', { precision: 12, scale: 2 }).notNull().default('0.00'),
    amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).notNull().default('0.00'),
    balanceDue: decimal('balance_due', { precision: 12, scale: 2 }).notNull().default('0.00'),
    status: varchar('status', { length: 30 }).notNull().default('UNPAID'), // UNPAID, PARTIAL, PAID, REFUNDED, CANCELLED
    notes: text('notes'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        patientIdIdx: index('invoices_patient_id_idx').on(table.patientId),
        statusIdx: index('invoices_status_idx').on(table.status),
        generatedAtIdx: index('invoices_generated_at_idx').on(table.generatedAt),
    };
});

// ============================
// INVOICE ITEMS TABLE
// ============================
export const invoiceItems = pgTable('invoice_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
    serviceCode: varchar('service_code', { length: 50 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        invoiceIdIdx: index('invoice_items_invoice_id_idx').on(table.invoiceId),
    };
});

// ============================
// PAYMENTS TABLE
// ============================
export const payments = pgTable('payments', {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
    amountPaid: decimal('amount_paid', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 30 }).notNull(), // CASH, MPESA, BANK_TRANSFER, INSURANCE
    referenceNumber: varchar('reference_number', { length: 100 }),
    cashTendered: decimal('cash_tendered', { precision: 12, scale: 2 }),
    changeDue: decimal('change_due', { precision: 12, scale: 2 }),
    cashierName: varchar('cashier_name', { length: 150 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        invoiceIdIdx: index('payments_invoice_id_idx').on(table.invoiceId),
    };
});

// ============================
// REFUNDS TABLE
// ============================
export const refunds = pgTable('refunds', {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
    refundAmount: decimal('refund_amount', { precision: 12, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    approvedBy: varchar('approved_by', { length: 150 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        invoiceIdIdx: index('refunds_invoice_id_idx').on(table.invoiceId),
    };
});

