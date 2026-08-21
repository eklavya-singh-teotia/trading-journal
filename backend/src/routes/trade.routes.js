import { Router } from "express";
import {
	getUserTrades,
	getTradeSummary,
	getTradeById,
	updateTradeJournal,
	deleteTrade,
} from "../controllers/trade.controller.js";
import { verifyJWT } from "../middlewares/auth.js";

const router = Router();

// Protect all trade routes with authentication
router.use(verifyJWT);

router.route("/").get(getUserTrades);
router.route("/summary").get(getTradeSummary);

router
	.route("/:id")
	.get(getTradeById)
	.delete(deleteTrade);

router.route("/:id/journal").put(updateTradeJournal);

export default router;
