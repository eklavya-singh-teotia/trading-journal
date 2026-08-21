import { Router } from "express";
import {
    getAnalyticsSummaryHandler,
    getDailyPnlHandler,
    getAnalyticsBreakdownHandler,
    getAIBehaviorAnalysisHandler,
    generateAIBehaviorAnalysisHandler,
    getRuleBasedBehaviorAnalysisHandler,
} from "../controllers/analytics.controller.js";
import { verifyJWT } from "../middlewares/auth.js";
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const aiAnalysisLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
    message: {
        error: "Too many requests. Please wait 15 minutes before regenerating behavioral analysis.",
        source: "RATE_LIMIT_EXCEEDED"
    }
});

const router = Router();

router.use(verifyJWT);

router.get("/summary", getAnalyticsSummaryHandler);
router.get("/daily-pnl", getDailyPnlHandler);
router.get("/breakdown", getAnalyticsBreakdownHandler);
router.get("/rule-behavior", getRuleBasedBehaviorAnalysisHandler);

// Fast Route (Returns fast metrics + saved DB insights, <50ms, 0 Gemini calls)
router.get("/behavior", getAIBehaviorAnalysisHandler);

// AI Trigger Route (Invokes Gemini API and upserts into MongoDB, rate-limited)
router.post("/behavior/generate", aiAnalysisLimiter, generateAIBehaviorAnalysisHandler);

export default router;
