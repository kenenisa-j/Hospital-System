import { db } from "../db";
import { invoices, payments } from "../schema/billing.schema";
import { sql, and, gte, lte, sum, count, desc } from "drizzle-orm";

// Daily cash collection summary aggregated by payment method
export async function getDailyCashCollections(startDate: Date, endDate: Date) {
    return await db
        .select({
            paymentMethod: payments.paymentMethod, // CASH, MPESA, BANK_TRANSFER, INSURANCE
            totalCollected: sum(payments.amountPaid),
            transactionCount: count(payments.id),
        })
        .from(payments)
        .where(and(
            gte(payments.processedAt, startDate),
            lte(payments.processedAt, endDate)
        ))
        .groupBy(payments.paymentMethod);
}

// Outstanding invoice balances
export async function getOutstandingBalances() {
    return await db
        .select({
            invoiceId: invoices.id,
            patientId: invoices.patientId,
            totalAmount: invoices.grandTotal,
            paidAmount: invoices.amountPaid,
            balanceDue: invoices.balanceDue,
            status: invoices.status,
        })
        .from(invoices)
        .where(sql`${invoices.balanceDue} > 0`)
        .orderBy(desc(invoices.generatedAt));
}

// Cashier shift summary
export async function getCashierShiftSummaries(startDate: Date, endDate: Date) {
    return await db
        .select({
            cashierId: sql<string | null>`NULL`,
            cashierName: payments.cashierName,
            totalCollected: sum(payments.amountPaid),
            receiptCount: count(payments.id),
        })
        .from(payments)
        .where(and(
            gte(payments.processedAt, startDate),
            lte(payments.processedAt, endDate)
        ))
        .groupBy(payments.cashierName);
}