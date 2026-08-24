// types/wards.ts
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE';

export interface Ward {
    id: string;
    name: string;
    type: 'GENERAL' | 'ICU' | 'PRIVATE' | 'MATERNITY';
}

export interface Bed {
    id: string;
    wardId: string;
    bedNumber: string;
    status: BedStatus;
    patientName?: string; // Optional: Show name if occupied
}
export interface TransferRecord {
    id: string;
    patientId: string;
    patientName: string;
    fromBedId: string;
    toBedId: string;
    reason: string;
    authorizedBy: string;
    timestamp: string;
}