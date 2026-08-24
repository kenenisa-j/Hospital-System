import { db } from './db';
import { labOrders } from './schema/wizard.schema';
import { eq, and, gte, asc } from 'drizzle-orm';

async function runCleanup() {
    console.log('Starting duplicate lab orders cleanup...');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get all orders created today
    const ordersToday = await db
        .select()
        .from(labOrders)
        .where(gte(labOrders.createdAt, todayStart))
        .orderBy(asc(labOrders.createdAt));

    console.log(`Found ${ordersToday.length} orders created today.`);

    const seen = new Set<string>();
    const toDeleteIds: string[] = [];

    for (const order of ordersToday) {
        // We only care about duplicate active/pending orders
        if (order.status !== 'ORDERED') {
            continue;
        }

        const key = `${order.patientId}_${order.testId}`;
        if (seen.has(key)) {
            // Already saw one today. Mark this one for deletion.
            toDeleteIds.push(order.id);
        } else {
            seen.add(key);
        }
    }

    if (toDeleteIds.length === 0) {
        console.log('No duplicate ORDERED lab orders found today.');
        process.exit(0);
    }

    console.log(`Found ${toDeleteIds.length} duplicate ORDERED lab orders to clean up.`);

    let deletedCount = 0;
    for (const id of toDeleteIds) {
        try {
            await db.delete(labOrders).where(eq(labOrders.id, id));
            deletedCount++;
        } catch (e) {
            console.error(`Failed to delete order ${id}:`, e);
        }
    }

    console.log(`Cleanup complete! Successfully deleted ${deletedCount} duplicate lab orders.`);
    process.exit(0);
}

runCleanup().catch(err => {
    console.error('Error running cleanup script:', err);
    process.exit(1);
});
