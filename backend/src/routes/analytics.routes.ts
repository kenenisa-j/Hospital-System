import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
    getPatientVolumeStats,
    getTopDiagnoses,
    getDepartmentBreakdown
} from "../../../database/src/queries/analytics.queries";

const router = Router();

// GET /api/analytics/clinical — Fetch Aggregate Clinical Dashboard Data
router.get("/clinical", authenticate, async (req: Request, res: Response) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const now = new Date();

        const [volumeTrends, topDiagnoses, deptBreakdown] = await Promise.all([
            getPatientVolumeStats(thirtyDaysAgo, now),
            getTopDiagnoses(5),
            getDepartmentBreakdown(),
        ]);

        return res.json({
            volumeTrends,
            topDiagnoses,
            deptBreakdown,
        });
    } catch (error) {
        return res.status(500).json({ error: "Failed to generate clinical analytics report" });
    }
});

export default router;