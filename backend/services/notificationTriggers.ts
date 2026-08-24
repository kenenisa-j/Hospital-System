import { sendNotification, NotificationType } from './socket.service';

// Trigger 1: Patient Added to Doctor Queue
export const notifyNewQueuePatient = (doctorRole: string, departmentId: string, patientName: string, queueNumber: number) => {
    sendNotification({
        type: NotificationType.NEW_QUEUE_PATIENT,
        title: 'New Patient in Queue',
        message: `${patientName} added to consultation queue (#${queueNumber}).`,
        targetRole: doctorRole,
        targetDepartmentId: departmentId,
        linkUrl: '/doctor/queue',
    });
};

// Trigger 2: Laboratory Test Results Ready
export const notifyLabResultReady = (doctorId: string, patientName: string, testName: string) => {
    sendNotification({
        type: NotificationType.LAB_RESULT_READY,
        title: 'Lab Result Completed',
        message: `${testName} results are ready for ${patientName}.`,
        targetRole: 'DOCTOR',
        linkUrl: '/doctor/queue',
    });
};

// Trigger 3: New Prescription Pending at Pharmacy
export const notifyPrescriptionPending = (patientName: string, itemCount: number) => {
    sendNotification({
        type: NotificationType.PRESCRIPTION_PENDING,
        title: 'New Prescription Sent',
        message: `Prescription for ${patientName} (${itemCount} items) awaiting fulfillment.`,
        targetRole: 'PHARMACIST',
        linkUrl: '/pharmacy/dispense',
    });
};

// Trigger 4: Low Stock Alert for Pharmacy / Store
export const notifyLowStockWarning = (itemName: string, currentStock: number, reorderLevel: number) => {
    sendNotification({
        type: NotificationType.LOW_STOCK_WARNING,
        title: 'Low Stock Warning',
        message: `${itemName} inventory is low (${currentStock} left, threshold: ${reorderLevel}).`,
        targetRole: 'PHARMACIST',
        linkUrl: '/pharmacy/inventory',
    });
};