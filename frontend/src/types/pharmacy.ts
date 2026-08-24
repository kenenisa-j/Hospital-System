export type DosageForm =
    | 'Tablet'
    | 'Capsule'
    | 'Syrup'
    | 'Injection'
    | 'Ointment'
    | 'Drops'
    | 'Inhaler'
    | 'Suppository';

export type UnitType =
    | 'Box'
    | 'Strip'
    | 'Bottle'
    | 'Vial'
    | 'Ampoule'
    | 'Tube'
    | 'Pack';

export interface Medicine {
    id: string;
    brandName: string;
    genericName: string;
    category: string;
    dosageForm: DosageForm;
    strength: string; // e.g., "500mg", "5ml/100mg"
    unitType: UnitType;
    requiresPrescription: boolean;
    manufacturer?: string;
    reorderLevel: number;
    status: 'ACTIVE' | 'DISCONTINUED';
    createdAt: string;
}
export interface StockBatch {
    id: string;
    medicineId: string;
    batchNumber: string;
    quantityOnHand: number;
    costPrice: number;
    sellingPrice: number;
    expiryDate: string; // ISO Date YYYY-MM-DD
    supplierName?: string;
    receivedDate: string;
    status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'QUARANTINED';
}

export interface InventoryItem extends Medicine {
    batches: StockBatch[];
    totalStock: number;
    nearestExpiryDate?: string;
}
export type MovementType =
    | 'PURCHASE'          // Received new inventory from supplier
    | 'DISPENSED'         // Deducted via prescription/sale
    | 'MANUAL_ADJUSTMENT' // Physical recount correction
    | 'EXPIRED_WRITEOFF'  // Discarded due to expiration
    | 'DAMAGE_WRITEOFF';  // Discarded due to damage/leakage

export interface StockMovement {
    id: string;
    batchId: string;
    medicineId: string;
    medicineName: string;
    batchNumber: string;
    movementType: MovementType;
    quantityChange: number; // Positive for additions, negative for deductions
    quantityAfter: number;
    reason?: string;
    performedBy: string;
    timestamp: string; // ISO String
}

export interface LowStockAlert {
    medicineId: string;
    brandName: string;
    genericName: string;
    currentStock: number;
    reorderLevel: number;
    status: 'CRITICAL' | 'WARNING';
}
export interface PrescriptionItem {
    id: string;
    medicineId: string;
    medicineName: string;
    dosage: string; // e.g., "500mg - 1 tab twice daily"
    prescribedQty: number;
    allocatedBatchId?: string;
    allocatedBatchNumber?: string;
    dispensedQty: number;
}

export interface DoctorPrescription {
    id: string;
    patientId: string;
    patientName: string;
    doctorName: string;
    prescribedDate: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'DISPENSED' | 'CANCELLED';
    items: PrescriptionItem[];
}