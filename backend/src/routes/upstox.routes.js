import { Router } from "express";
import {
    connectUpstox,
    handleUpstoxCallback,
    syncUpstoxTrades,
} from "../controllers/upstox.controller.js";
import { verifyJWT } from "../middlewares/auth.js";

const router = Router();

// Protect all Upstox routes with user authentication middleware
router.use(verifyJWT);

router.get("/auth", connectUpstox);
router.get("/callback", handleUpstoxCallback);
router.post("/sync/:accountId", syncUpstoxTrades);

export default router;