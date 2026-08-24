import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
    getBedOccupancyRates,
    getExpiringMedicineBatches,
    getLowStockAlerts,
} from "../../../database/src/queries/inventory_operational.queries";

const router = Router();

// GET /api/analytics/operational — Bed Occupancy & Inventory Health
router.get("/operational", authenticate, async (req: Request, res: Response) => {
    try {
        const [bedOccupancy, expiringBatches, lowStock] = await Promise.all([
            getBedOccupancyRates(),
            getExpiringMedicineBatches(90), // Alert for items expiring within 90 days
            getLowStockAlerts(),
        ]);

        return res.json({
            bedOccupancy,
            expiringBatches,
            lowStock,
        });
    } catch (error) {
        return res.status(500).json({ error: "Failed to generate operational reports" });
    }
});

export default router;