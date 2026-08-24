import { db } from "../db";
import { beds, wards, inventory, batches } from "../schema/hospital.schema";
import { sql, eq, lte, gte, count, sum, desc, and } from "drizzle-orm";

// 1. Bed Occupancy Rate Query
export async function getBedOccupancyRates() {
    return await db
        .select({
            wardId: wards.id,
            wardName: wards.name,
            totalBeds: count(beds.id),
            occupiedBeds: sql<number>`COUNT(CASE WHEN ${beds.status} = 'OCCUPIED' THEN 1 END)`,
            occupancyRate: sql<number>`
        ROUND(
          (COUNT(CASE WHEN ${beds.status} = 'OCCUPIED' THEN 1 END)::decimal / NULLIF(COUNT(${beds.id}), 0)::decimal) * 100, 
          1
        )
      `,
        })
        .from(wards)
        .leftJoin(beds, eq(beds.wardId, wards.id))
        .groupBy(wards.id, wards.name);
}

// 2. Expiring / Expired Medication Batches Query
export async function getExpiringMedicineBatches(daysThreshold = 90) {
    const futureThreshold = new Date();
    futureThreshold.setDate(futureThreshold.getDate() + daysThreshold);

    return await db
        .select({
            batchId: batches.id,
            batchNumber: batches.batchNumber,
            itemName: inventory.itemName,
            unit: inventory.unit,
            remainingQuantity: batches.currentQuantity,
            expiryDate: batches.expiryDate,
            isExpired: sql<boolean>`${batches.expiryDate} <= NOW()`,
        })
        .from(batches)
        .innerJoin(inventory, eq(batches.inventoryId, inventory.id))
        .where(lte(batches.expiryDate, futureThreshold))
        .orderBy(batches.expiryDate);
}

// 3. Low Stock Alerts Query
export async function getLowStockAlerts() {
    return await db
        .select({
            inventoryId: inventory.id,
            itemName: inventory.itemName,
            category: inventory.category,
            currentStock: inventory.totalStock,
            minReorderLevel: inventory.reorderLevel,
            shortage: sql<number>`${inventory.reorderLevel} - ${inventory.totalStock}`,
        })
        .from(inventory)
        .where(sql`${inventory.totalStock} <= ${inventory.reorderLevel}`)
        .orderBy(inventory.totalStock);
}