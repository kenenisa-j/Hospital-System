import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
    getDailyCashCollections,
    getOutstandingBalances,
    getCashierShiftSummaries,
} from "../../../database/src/queries/financial.queries";

const router = Router();

// GET /api/analytics/financial — Revenue & Cashier Shift Report
router.get("/financial", authenticate, async (req: Request, res: Response) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const [collections, pendingInvoices, cashierSummaries] = await Promise.all([
            getDailyCashCollections(startOfDay, endOfDay),
            getOutstandingBalances(),
            getCashierShiftSummaries(startOfDay, endOfDay),
        ]);

        return res.json({
            currency: "ETB",
            collections,
            pendingInvoices,
            cashierSummaries,
        });
    } catch (error) {
        return res.status(500).json({ error: "Failed to compile financial revenue reports" });
    }
});

export default router;