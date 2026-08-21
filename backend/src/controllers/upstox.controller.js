import jwt from "jsonwebtoken";
import {
    buildAuthorizationUrl,
    exchangeCodeForToken,
    syncTrades,
} from "../services/upstox.service.js";

import { Account } from "../models/account.model.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";

const createOAuthState = (userId) => {
    const secret = process.env.UPSTOX_OAUTH_STATE_SECRET;

    if (!secret) {
        throw new ApiError(
            500,
            "UPSTOX_OAUTH_STATE_SECRET is not configured."
        );
    }

    return jwt.sign(
        {
            userId: userId.toString(),
            purpose: "upstox_oauth",
        },
        secret,
        {
            expiresIn: "10m",
        }
    );
};

const verifyOAuthState = (state) => {
    const secret = process.env.UPSTOX_OAUTH_STATE_SECRET;

    if (!secret) {
        throw new ApiError(
            500,
            "UPSTOX_OAUTH_STATE_SECRET is not configured."
        );
    }

    try {
        const decoded = jwt.verify(state, secret);

        if (decoded?.purpose !== "upstox_oauth") {
            throw new ApiError(400, "Invalid Upstox OAuth state.");
        }

        return decoded;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            400,
            "Invalid or expired Upstox OAuth state."
        );
    }
};

/*
 * Start Upstox OAuth flow.
 * GET /api/v1/upstox/auth
 */
export const connectUpstox = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized request.");
    }

    const state = createOAuthState(userId);

    const authorizationUrl = buildAuthorizationUrl(state);

    return res.status(200).json(
        new ApiResponse(200, { authorizationUrl }, "Upstox authorization URL generated.")
    );
});

/*
 * Handle Upstox OAuth callback.
 * GET /api/v1/upstox/callback
 */
export const handleUpstoxCallback = asyncHandler(async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const { code, state, error, error_description } = req.query;

    // Helper to handle redirect errors cleanly back to the UI
    const redirectWithError = (message) => {
        return res.redirect(
            `${frontendUrl}/dashboard?broker=upstox&status=error&message=${encodeURIComponent(message)}`
        );
    };

    if (error) {
        return redirectWithError(error_description || `Upstox authorization failed: ${error}`);
    }

    if (!code) {
        return redirectWithError("Upstox authorization code is missing.");
    }

    if (!state) {
        return redirectWithError("Upstox OAuth state is missing.");
    }

    const decodedState = verifyOAuthState(state);
    const tokenData = await exchangeCodeForToken(code);

    const accessToken = tokenData?.access_token;
    const userId = tokenData?.user_id;

    if (!accessToken || !userId) {
        return redirectWithError("Failed to retrieve valid credentials from Upstox.");
    }

    const appUserId = decodedState.userId;
    const tokenExpiresAt = calculateUpstoxTokenExpiry();

    await Account.findOneAndUpdate(
        {
            user: appUserId,
            broker: "upstox",
            brokerUserId: userId,
        },
        {
            $set: {
                accessToken,
                tokenExpiresAt,
                isActive: true,
            },
            $setOnInsert: {
                user: appUserId,
                broker: "upstox",
                brokerUserId: userId,
                accountName: tokenData?.user_name
                    ? `Upstox - ${tokenData.user_name}`
                    : "Upstox Account",
            },
        },
        {
            new: true,
            upsert: true,
            runValidators: true,
        }
    );

    return res.redirect(`${frontendUrl}/dashboard?broker=upstox&status=success`);
});

/**
 * Sync Upstox trades.
 *
 * POST /api/v1/upstox/sync/:accountId
 */
export const syncUpstoxTrades = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized request.");
    }

    const { accountId } = req.params;

    const {
        startDate,
        endDate,
        segment,
    } = req.body || {};

    const result = await syncTrades({
        userId,
        accountId,
        startDate,
        endDate,
        segment,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Upstox trades synchronized successfully."
        )
    );
});

/**
 * Calculate the next 3:30 AM Asia/Kolkata expiration.
 * Upstox access tokens expire at 3:30 AM the following day,
 * regardless of when the token was generated.
 */
function calculateUpstoxTokenExpiry() {
    const now = new Date();

    const expiry = new Date(now);

    expiry.setHours(3, 30, 0, 0);

    if (expiry <= now) {
        expiry.setDate(expiry.getDate() + 1);
    }

    return expiry;
};