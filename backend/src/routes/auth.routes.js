import { Router } from "express";
import { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken 
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.js";
import rateLimit from 'express-rate-limit';

// Strict limiter for login attempts
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 5, // 5 failed attempts per IP
    skipSuccessfulRequests: true, // Only count failed logins
    message: {
        error: "Too many failed login attempts. Please wait 15 minutes before trying again."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Moderate limiter for account creation to prevent bot spam
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1-hour window
    max: 3, // Max 3 account registrations per IP per hour
    message: {
        error: "Too many accounts created from this IP. Please try again in an hour."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const router = Router();

router.route("/register").post(registerLimiter, registerUser);
router.route("/login").post(loginLimiter, loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;