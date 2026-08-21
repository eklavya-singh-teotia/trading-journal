import { Account } from "../models/account.model.js";
import { Execution } from "../models/execution.model.js";
import { processExecutionsFIFO } from "./fifoMatching.service.js";
import { ApiError } from "../utils/apierror.js";

const UPSTOX_BASE_URL = "https://api.upstox.com/v2";

const UPSTOX_ENDPOINTS = {
    authorize: `${UPSTOX_BASE_URL}/login/authorization/dialog`,
    token: `${UPSTOX_BASE_URL}/login/authorization/token`,
    tradesForDay: `${UPSTOX_BASE_URL}/order/trades/get-trades-for-day`,
    historicalTrades: `${UPSTOX_BASE_URL}/charges/historical-trades`,
};

function getUpstoxConfig() {
    const {
        UPSTOX_CLIENT_ID,
        UPSTOX_CLIENT_SECRET,
        UPSTOX_REDIRECT_URI,
    } = process.env;

    if (!UPSTOX_CLIENT_ID) {
        throw new ApiError(500, "UPSTOX_CLIENT_ID is not configured.");
    }

    if (!UPSTOX_CLIENT_SECRET) {
        throw new ApiError(500, "UPSTOX_CLIENT_SECRET is not configured.");
    }

    if (!UPSTOX_REDIRECT_URI) {
        throw new ApiError(500, "UPSTOX_REDIRECT_URI is not configured.");
    }

    return {
        clientId: UPSTOX_CLIENT_ID,
        clientSecret: UPSTOX_CLIENT_SECRET,
        redirectUri: UPSTOX_REDIRECT_URI,
    };
}

async function parseUpstoxResponse(response) {
    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.errors?.[0]?.message ||
            data?.message ||
            `Upstox API request failed with status ${response.status}.`;

        throw new ApiError(
            response.status,
            message,
            data?.errors || []
        );
    }

    return data;
}

/**
 * Build the URL where the user is sent to authorize
 * our application with Upstox.
 */
export function buildAuthorizationUrl(state) {
    const { clientId, redirectUri } = getUpstoxConfig();

    const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
    });

    if (state) {
        params.set("state", state);
    }

    return `${UPSTOX_ENDPOINTS.authorize}?${params.toString()}`;
}

/**
 * Exchange Upstox's single-use authorization code
 * for an access token.
 */
export async function exchangeCodeForToken(code) {
    if (!code) {
        throw new ApiError(400, "Upstox authorization code is required.");
    }

    const {
        clientId,
        clientSecret,
        redirectUri,
    } = getUpstoxConfig();

    const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
    });

    const response = await fetch(UPSTOX_ENDPOINTS.token, {
        method: "POST",
        headers: {
            accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    return parseUpstoxResponse(response);
}

/**
 * Fetch all trades executed today.
 */
export async function getTradesForDay(accessToken) {
    if (!accessToken) {
        throw new ApiError(401, "Upstox access token is required.");
    }

    const response = await fetch(UPSTOX_ENDPOINTS.tradesForDay, {
        method: "GET",
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const result = await parseUpstoxResponse(response);

    return result?.data || [];
}

/**
 * Fetch historical trades for a selected date range.
 * Upstox historical trade API supports:
 * - start_date
 * - end_date
 * - page_number
 * - page_size
 * - optional segment
 */
export async function getHistoricalTrades(
    accessToken,
    {
        startDate,
        endDate,
        segment,
        pageNumber = 1,
        pageSize = 100,
    } = {}
) {
    if (!accessToken) {
        throw new ApiError(401, "Upstox access token is required.");
    }

    if (!startDate || !endDate) {
        throw new ApiError(
            400,
            "startDate and endDate are required for historical trades."
        );
    }

    if (startDate > endDate) {
        throw new ApiError(
            400,
            "startDate cannot be later than endDate."
        );
    }

    const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        page_number: String(pageNumber),
        page_size: String(pageSize),
    });

    if (segment) {
        params.set("segment", segment);
    }

    const response = await fetch(
        `${UPSTOX_ENDPOINTS.historicalTrades}?${params.toString()}`,
        {
            method: "GET",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    const result = await parseUpstoxResponse(response);

    return {
        trades: result?.data || [],
        metadata: result?.meta_data || null,
    };
}

/**
 * Convert Upstox's product code into the application's
 * Execution.product enum.
 */
function normalizeProduct(product) {
    if (!product) return undefined;

    const normalized = String(product).trim().toUpperCase();

    const productMap = {
        I: "INTRADAY",
        D: "DELIVERY",
        MTF: "MTF",
        CO: "CO",
        OCO: "OCO",
    };

    return productMap[normalized];
}

/**
 * Convert Upstox exchange/segment into the application's
 * Execution.segment enum.
 */
function normalizeSegment(exchange, segment) {
    const normalizedSegment = segment
        ? String(segment).trim().toUpperCase()
        : null;

    if (["EQ", "FO", "CD", "COM"].includes(normalizedSegment)) {
        return normalizedSegment;
    }

    const normalizedExchange = exchange
        ? String(exchange).trim().toUpperCase()
        : null;

    const exchangeMap = {
        NSE: "EQ",
        BSE: "EQ",
        NFO: "FO",
        MCX: "COM",
        CDS: "CD",
    };

    return exchangeMap[normalizedExchange];
}

/**
 * Convert one Upstox trade into the application's
 * Execution document shape.
 * historical = true because the historical endpoint
 * has different field names and does not provide an
 * exact execution timestamp.
 */
export function normalizeUpstoxTrade({
    trade,
    userId,
    accountId,
    historical = false,
}) {
    if (!trade) {
        throw new ApiError(400, "Invalid Upstox trade data.");
    }

    const exchange = String(trade.exchange || "").trim().toUpperCase();

    const transactionType = String(
        trade.transaction_type || ""
    ).trim().toUpperCase();

    if (!["BUY", "SELL"].includes(transactionType)) {
        throw new ApiError(
            400,
            `Invalid Upstox transaction type: ${trade.transaction_type}`
        );
    }

    const quantity = Number(trade.quantity);
    const price = Number(
        historical ? trade.price : trade.average_price
    );

    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ApiError(400, "Invalid Upstox trade quantity.");
    }

    if (!Number.isFinite(price) || price < 0) {
        throw new ApiError(400, "Invalid Upstox trade price.");
    }

    const brokerExecutionId = String(trade.trade_id || "").trim();

    if (!brokerExecutionId) {
        throw new ApiError(
            400,
            "Upstox trade is missing trade_id."
        );
    }

    let executionTime;

    if (historical) {
        if (!trade.trade_date) {
            throw new ApiError(
                400,
                "Historical Upstox trade is missing trade_date."
            );
        }

        // Historical API provides trade_date but not an exact
        // intraday execution timestamp.
        executionTime = new Date(`${trade.trade_date}T00:00:00.000Z`);
    } else {
        if (!trade.exchange_timestamp) {
            throw new ApiError(
                400,
                "Upstox trade is missing exchange_timestamp."
            );
        }

        executionTime = new Date(trade.exchange_timestamp);
    }

    if (Number.isNaN(executionTime.getTime())) {
        throw new ApiError(
            400,
            "Invalid execution timestamp received from Upstox."
        );
    }

    const normalizedSymbol =
        trade.trading_symbol ||
        trade.tradingsymbol ||
        trade.symbol ||
        trade.scrip_name;

    if (!normalizedSymbol) {
        throw new ApiError(
            400,
            "Upstox trade is missing a trading symbol."
        );
    }

    const normalizedSegment = normalizeSegment(
        exchange,
        trade.segment
    );

    if (!normalizedSegment) {
        throw new ApiError(
            400,
            `Unsupported Upstox segment/exchange: ${trade.segment || exchange}`
        );
    }

    const execution = {
        user: userId,
        account: accountId,

        processed: false,
        processedAt: null,

        brokerExecutionId,
        orderId:
            trade.order_id ||
            trade.order_ref_id ||
            trade.exchange_order_id ||
            null,

        source: "UPSTOX_API",

        symbol: String(normalizedSymbol).trim().toUpperCase(),

        instrumentToken:
            trade.instrument_token ||
            null,

        exchange,

        segment: normalizedSegment,

        transactionType,

        product: normalizeProduct(trade.product),

        quantity,

        price,

        executionTime,

        fees: 0,
    };

    return execution;
}

/**
 * Synchronize Upstox trades into the application's
 * Execution model and then process pending executions
 * through the existing FIFO engine.
 * options:
 * {
 *   startDate,
 *   endDate,
 *   segment
 * }
 */
export async function syncTrades({
    userId,
    accountId,
    startDate,
    endDate,
    segment,
} = {}) {
    if (!userId) {
        throw new ApiError(401, "User is required.");
    }

    if (!accountId) {
        throw new ApiError(400, "Account ID is required.");
    }

    const account = await Account.findOne({
        _id: accountId,
        user: userId,
        broker: "upstox",
    }).select("+accessToken +refreshToken");

    if (!account) {
        throw new ApiError(404, "Upstox account not found.");
    }

    if (!account.isActive) {
        throw new ApiError(
            400,
            "This Upstox account is disconnected."
        );
    }

    if (!account.accessToken) {
        throw new ApiError(
            401,
            "Upstox account requires authorization."
        );
    }

    let upstoxTrades = [];
    let historical = false;
    let metadata = null;

    const today = new Date().toISOString().slice(0, 10);

    const targetStartDate = startDate || today;
    const targetEndDate = endDate || today;

    if (targetStartDate === today && targetEndDate === today) {
        upstoxTrades = await getTradesForDay(account.accessToken);
    } else {
        historical = true;

        let pageNumber = 1;
        const pageSize = 100;

        while (true) {
            const page = await getHistoricalTrades(
                account.accessToken,
                {
                    startDate: targetStartDate,
                    endDate: targetEndDate,
                    segment,
                    pageNumber,
                    pageSize,
                }
            );

            upstoxTrades.push(...page.trades);
            metadata = page.metadata;

            const totalPages =
                Number(page.metadata?.page?.total_pages) || 1;

            if (pageNumber >= totalPages) {
                break;
            }

            pageNumber++;
        }
    }

    const normalizedExecutions = upstoxTrades.map((trade) =>
        normalizeUpstoxTrade({
            trade,
            userId,
            accountId,
            historical,
        })
    );

    // Prevent duplicate operations inside the same API response.
    const uniqueExecutions = [];
    const seenExecutionIds = new Set();

    for (const execution of normalizedExecutions) {
        if (seenExecutionIds.has(execution.brokerExecutionId)) {
            continue;
        }

        seenExecutionIds.add(execution.brokerExecutionId);
        uniqueExecutions.push(execution);
    }

    if (!uniqueExecutions.length) {
        account.lastSyncedAt = new Date();
        await account.save();

        return {
            fetched: upstoxTrades.length,
            inserted: 0,
            duplicates: 0,
            processed: 0,
            lastSyncedAt: account.lastSyncedAt,
            historical,
            metadata,
        };
    }

    const bulkOperations = uniqueExecutions.map((execution) => ({
        updateOne: {
            filter: {
                account: execution.account,
                brokerExecutionId: execution.brokerExecutionId,
            },
            update: {
                $setOnInsert: execution,
            },
            upsert: true,
        },
    }));

    const bulkResult = await Execution.bulkWrite(bulkOperations);

    const inserted =
        bulkResult.upsertedCount || 0;

    const duplicates =
        uniqueExecutions.length - inserted;

    const fifoSummary = await processExecutionsFIFO(
        userId,
        accountId
    );

    account.lastSyncedAt = new Date();
    await account.save();

    return {
        fetched: upstoxTrades.length,
        uniqueFetched: uniqueExecutions.length,
        inserted,
        duplicates,
        processed: fifoSummary.processedCount || 0,
        fifoStatus: fifoSummary.status,
        lastSyncedAt: account.lastSyncedAt,
        historical,
        metadata,
    };
}