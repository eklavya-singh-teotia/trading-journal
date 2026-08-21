import { Trade } from "../models/trade.model.js";
import { Execution } from "../models/execution.model.js";
import { processExecutionsFIFO } from "../services/fifoMatching.service.js";
import { getAnalyticsSummary } from "../services/analytics.service.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";

/**
 * @desc    Get all trades for the logged-in user (with filtering and pagination)
 * @route   GET /api/v1/trades
 * @access  Private
 */
export const getUserTrades = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const {
		page = 1,
		limit = 20,
		status,
		symbol,
		result,
		account,
		accountId,
		startDate,
		endDate,
	} = req.query;

	// 1. Build the filter query
	const query = { user: userId };

	const selectedAccount = accountId || account;
	if (selectedAccount) query.account = selectedAccount;
	if (status) query.status = status.toUpperCase();
	if (symbol) query.symbol = symbol.toUpperCase();
	if (result) query.result = result.toUpperCase();

	// Date range filter based on entryTime
	if (startDate || endDate) {
		query.entryTime = {};
		if (startDate) query.entryTime.$gte = new Date(startDate);
		if (endDate) query.entryTime.$lte = new Date(endDate);
	}

	// 2. Execute pagination and fetch
	const skip = (Number(page) - 1) * Number(limit);

	const [trades, totalTrades] = await Promise.all([
		Trade.find(query)
			.sort({ entryTime: -1 })
			.skip(skip)
			.limit(Number(limit))
			.populate("account", "accountName broker")
			.lean(),
		Trade.countDocuments(query),
	]);

	const responsePayload = {
		trades,
		pagination: {
			total: totalTrades,
			totalPages: Math.ceil(totalTrades / Number(limit)),
			currentPage: Number(page),
			limit: Number(limit),
		},
	};

	return res
		.status(200)
		.json(new ApiResponse(200, responsePayload, "Trades fetched successfully"));
});

/**
 * @desc    Get trade summary metrics (win rate, total PnL, total trades)
 * @route   GET /api/v1/trades/summary
 * @access  Private
 */
export const getTradeSummary = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const { accountId, account, startDate, endDate } = req.query;
	const targetAccountId = accountId || account;
	const summary = await getAnalyticsSummary(userId, targetAccountId, startDate, endDate);

	return res
		.status(200)
		.json(new ApiResponse(200, summary, "Trade summary fetched successfully"));
});

/**
 * @desc    Get a single trade by ID with its execution history
 * @route   GET /api/v1/trades/:id
 * @access  Private
 */
export const getTradeById = asyncHandler(async (req, res) => {
	const { id: tradeId } = req.params;
	const userId = req.user?._id;

	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const trade = await Trade.findOne({ _id: tradeId, user: userId })
		.populate({
			path: "executions",
			select: "symbol transactionType quantity price fees executionTime brokerExecutionId orderId",
			options: { sort: { executionTime: 1 } },
		})
		.populate("account", "accountName broker");

	if (!trade) {
		throw new ApiError(404, "Trade not found");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, trade, "Trade details fetched successfully"));
});


function calculateRR(direction, avgEntryPrice, avgExitPrice, stopLoss, targetPrice = null) {
	if (!avgEntryPrice || !stopLoss || avgEntryPrice === stopLoss) {
		return null;
	}

	const risk = Math.abs(avgEntryPrice - stopLoss);
	if (risk === 0) return null;

	let reward = 0;
	const exitOrTarget = avgExitPrice ?? targetPrice;

	if (exitOrTarget == null) {
		return null;
	}

	if (direction === "LONG") {
		reward = exitOrTarget - avgEntryPrice;
	} else if (direction === "SHORT") {
		reward = avgEntryPrice - exitOrTarget;
	} else {
		return null;
	}

	const rr = reward / risk;
	return Number(rr.toFixed(2));
}
/**
 * @desc    Update trading journal details for a specific trade
 * @route   PUT /api/v1/trades/:id/journal
 * @access  Private
 */
export const updateTradeJournal = asyncHandler(async (req, res) => {
	const { id: tradeId } = req.params;
	const userId = req.user?._id;

	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const {
		stopLoss,
		targetPrice,
		strategy,
		timeframe,
		notes,
		tags,
		journal,
	} = req.body;

	const trade = await Trade.findOne({ _id: tradeId, user: userId });

	if (!trade) {
		throw new ApiError(404, "Trade not found");
	}

	if (stopLoss !== undefined) trade.stopLoss = stopLoss;
	if (targetPrice !== undefined) trade.targetPrice = targetPrice;
	if (strategy !== undefined) trade.strategy = strategy;
	if (timeframe !== undefined) trade.timeframe = timeframe;
	if (notes !== undefined) trade.notes = notes;
	if (tags !== undefined) trade.tags = tags;

	if (journal && typeof journal === "object") {
		trade.journal = {
			...trade.journal?.toObject(),
			...journal,
		};
	}

	if (stopLoss !== undefined || targetPrice !== undefined) {
		trade.rr = calculateRR(
			trade.direction,
			trade.avgEntryPrice,
			trade.avgExitPrice,
			trade.stopLoss,
			trade.targetPrice
		);
	}

	await trade.save();

	return res
		.status(200)
		.json(new ApiResponse(200, trade, "Trade journal updated successfully"));
});

/**
 * @desc    Delete a specific trade and reset associated executions for re-matching
 * @route   DELETE /api/v1/trades/:id
 * @access  Private
 */
export const deleteTrade = asyncHandler(async (req, res) => {
	const { id: tradeId } = req.params;
	const userId = req.user?._id;

	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const trade = await Trade.findOne({ _id: tradeId, user: userId });

	if (!trade) {
		throw new ApiError(404, "Trade not found");
	}

	const accountId = trade.account;
	const executionIds = trade.executions || [];

	// 1. Reset associated executions so they are not permanently orphaned
	if (executionIds.length > 0) {
		await Execution.updateMany(
			{ _id: { $in: executionIds }, user: userId },
			{ $set: { processed: false, processedAt: null } }
		);
	}

	// 2. Delete the trade document
	await Trade.deleteOne({ _id: trade._id, user: userId });

	// 3. Re-run FIFO processing to update position state
	let fifoSummary = null;
	if (accountId) {
		fifoSummary = await processExecutionsFIFO(userId, accountId);
	}

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				{ deletedTradeId: tradeId, fifoSummary },
				"Trade deleted and associated executions reset for re-matching successfully"
			)
		);
});