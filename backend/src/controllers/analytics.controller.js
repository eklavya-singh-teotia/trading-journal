import {
	getAnalyticsSummary,
	getDailyPnl,
	getAnalyticsBreakdown,
	getBehavioralAnalysis,
	generateAndSaveAIBehavioralAnalysis,
	getRuleBasedBehavioralAnalysis,
} from "../services/analytics.service.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";

/**
 * @desc    Get overall quantitative analytics summary metrics
 * @route   GET /api/v1/analytics/summary
 * @access  Private
 */
export const getAnalyticsSummaryHandler = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const { accountId, account, startDate, endDate } = req.query;
	const targetAccount = accountId || account;

	const summary = await getAnalyticsSummary(userId, targetAccount, startDate, endDate);

	return res
		.status(200)
		.json(new ApiResponse(200, summary, "Analytics summary fetched successfully"));
});

/**
 * @desc    Get daily PnL breakdown and equity curve data
 * @route   GET /api/v1/analytics/daily-pnl
 * @access  Private
 */
export const getDailyPnlHandler = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const { accountId, account, startDate, endDate } = req.query;
	const targetAccount = accountId || account;

	const dailyPnl = await getDailyPnl(userId, targetAccount, startDate, endDate);

	return res
		.status(200)
		.json(new ApiResponse(200, dailyPnl, "Daily PnL timeline fetched successfully"));
});

/**
 * @desc    Get performance breakdown by symbol, day of week, time of day, strategy
 * @route   GET /api/v1/analytics/breakdown
 * @access  Private
 */
export const getAnalyticsBreakdownHandler = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const { accountId, account, startDate, endDate } = req.query;
	const targetAccount = accountId || account;

	const breakdown = await getAnalyticsBreakdown(userId, targetAccount, startDate, endDate);

	return res
		.status(200)
		.json(new ApiResponse(200, breakdown, "Analytics breakdown fetched successfully"));
});

/**
 * @desc    Get Fast Behavioral Analytics (metrics + saved AI Insights from MongoDB if available, <50ms response, 0 Gemini calls)
 * @route   GET /api/v1/analytics/behavior
 * @access  Private
 */
export const getAIBehaviorAnalysisHandler = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const { accountId, account, startDate, endDate } = req.query;
	const targetAccount = accountId || account;

	const behaviorData = await getBehavioralAnalysis(userId, targetAccount, startDate, endDate);

	return res
		.status(200)
		.json(new ApiResponse(200, behaviorData, "Behavioral Analytics fetched successfully"));
});

/**
 * @desc    Generate On-Demand AI Behavioral Insights (Invokes Gemini API and upserts into MongoDB)
 * @route   POST /api/v1/analytics/behavior/generate
 * @access  Private
 */
export const generateAIBehaviorAnalysisHandler = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const { accountId, account, startDate, endDate } = req.query;
	const bodyAccount = req.body?.accountId || req.body?.account;
	const bodyStart = req.body?.startDate;
	const bodyEnd = req.body?.endDate;

	const targetAccount = accountId || account || bodyAccount;
	const targetStart = startDate || bodyStart;
	const targetEnd = endDate || bodyEnd;

	const behaviorData = await generateAndSaveAIBehavioralAnalysis(
		userId,
		targetAccount,
		targetStart,
		targetEnd
	);

	return res
		.status(200)
		.json(new ApiResponse(200, behaviorData, "AI Behavioral Insights generated & saved successfully"));
});

/**
 * @desc    Get Algorithmic Rule-Based Behavioral Analytics (no Gemini API calls, fast <50ms response)
 * @route   GET /api/v1/analytics/rule-behavior
 * @access  Private
 */
export const getRuleBasedBehaviorAnalysisHandler = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	if (!userId) {
		throw new ApiError(401, "Unauthorized request");
	}

	const { accountId, account, startDate, endDate } = req.query;
	const targetAccount = accountId || account;

	const behaviorData = await getRuleBasedBehavioralAnalysis(userId, targetAccount, startDate, endDate);

	return res
		.status(200)
		.json(new ApiResponse(200, behaviorData, "Algorithmic Behavioral Analytics fetched successfully"));
});

