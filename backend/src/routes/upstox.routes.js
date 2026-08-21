import { Router } from "express";
import {
    connectUpstox,
    handleUpstoxCallback,
    syncUpstoxTrades,
} from "../controllers/upstox.controller.js";
import { verifyJWT } from "../middlewares/auth.js";

const router = Router();

// Upstox Auth Start (Requires logged-in user session)
router.get("/auth", verifyJWT, connectUpstox);

// Upstox OAuth Callback (Public endpoint: authenticity & user session are verified via signed OAuth state parameter)
router.get("/callback", handleUpstoxCallback);

// Sync Upstox Trades (Requires logged-in user session)
router.post("/sync/:accountId", verifyJWT, syncUpstoxTrades);

export default router;