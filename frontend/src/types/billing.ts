export type ServiceCategory =
    | 'CONSULTATION'
    | 'LABORATORY'
    | 'RADIOLOGY'
    | 'PHARMACY'
    | 'INPATIENT_ROOM';

export interface UnbilledChargeItem {
    id: string;
    category: ServiceCategory;
    serviceName: string;
    unitPrice: number;
    quantity: number;
    amount: number;
    performerOrDoctor: string;
    orderedAt: string;
    sourceReferenceId: string; // e.g., Lab Order ID, Pharmacy Dispense ID
}

export interface PatientBillingLedger {
    patientId: string;
    patientName: string;
    mrn: string; // Medical Record Number
    phone: string;
    unbilledItems: UnbilledChargeItem[];
}

export interface MasterInvoice {
    invoiceNumber: string;
    patientId: string;
    patientName: string;
    items: UnbilledChargeItem[];
    subtotal: number;
    discountAmount: number;
    taxRate: number; // Percentage (e.g., 15 for 15%)
    taxAmount: number;
    grandTotal: number;
    paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    generatedAt: string;
}
export type PaymentMethod = 'CASH' | 'POS_CARD' | 'BANK_TRANSFER' | 'CHECK';

export interface PaymentRecord {
    id: string;
    invoiceNumber: string;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string; // Bank Transaction Ref / POS Auth Code
    cashTendered?: number;
    changeDue?: number;
    cashierName: string;
    processedAt: string;
}

export interface CashierInvoiceSummary {
    invoiceNumber: string;
    patientId: string;
    patientName: string;
    mrn: string;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    generatedAt: string;
    itemsCount: number;
}
export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'CANCELLED';

export interface RefundRecord {
    id: string;
    invoiceNumber: string;
    refundAmount: number;
    reason: string;
    approvedBy: string;
    processedAt: string;
}

export interface InvoiceLifecycleEvent {
    id: string;
    invoiceNumber: string;
    previousStatus: InvoiceStatus;
    newStatus: InvoiceStatus;
    notes: string;
    triggeredBy: string;
    timestamp: string;
}

export interface DetailedInvoiceSummary {
    invoiceNumber: string;
    patientId: string;
    patientName: string;
    mrn: string;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    status: InvoiceStatus;
    generatedAt: string;
    lastUpdatedAt: string;
    itemsCount: number;
    refunds?: RefundRecord[];
}