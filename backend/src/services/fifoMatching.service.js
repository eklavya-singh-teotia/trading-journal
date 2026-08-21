import mongoose from "mongoose";
import { Execution } from "../models/execution.model.js";
import { Trade } from "../models/trade.model.js";


// 1. PURE MATH & METRIC HELPER FUNCTIONS

const round = (value) => Number(value.toFixed(4));

/**
 * Calculates the Holding Period in minutes.
 */
export function calculateHoldingPeriod(entryTime, exitTime) {
	if (!entryTime || !exitTime) return 0;
	const start = new Date(entryTime);
	const end = new Date(exitTime);
	return Math.max(0, Math.round((end - start) / 60000));
}

/**
 * Determines trade result status from status & realized PnL.
 */
export function calculateResult(status, realizedPnl) {
	if (status === "OPEN" && realizedPnl === 0) return "OPEN";
	if (realizedPnl > 0) return "WIN";
	if (realizedPnl < 0) return "LOSS";
	return "BREAKEVEN";
}

/**
 * Calculates Unrealized PnL for currently open position quantity.
 */
export function calculateUnrealizedPnl(direction, openQuantity, avgEntryPrice, currentMarketPrice) {
	if (!openQuantity || avgEntryPrice == null || currentMarketPrice == null) return 0;

	const pnlPerUnit = direction === "LONG"
		? currentMarketPrice - avgEntryPrice
		: avgEntryPrice - currentMarketPrice;

	return round(pnlPerUnit * openQuantity);
}


// 2. AUTOMATED BEHAVIORAL RULE ENGINE
/**
 * Derives emotional and behavioral metrics purely from execution timing and sizing.
 */
async function deriveBehavioralMetrics(trade, session) {
	const analysis = {
		isRevengeTrade: false,
		isAveragingDown: false,
		isSizeSpike: false,
		timeSinceLastTrade: null,
		behavioralTags: [],
	};

	// Find the user's previous trade closed prior to this entry
	const previousTrade = await Trade.findOne({
		user: trade.user,
		account: trade.account,
		_id: { $ne: trade._id },
		entryTime: { $lt: trade.entryTime },
	})
		.sort({ exitTime: -1, entryTime: -1 })
		.session(session)
		.lean();

	if (previousTrade && previousTrade.exitTime) {
		const gapMs = new Date(trade.entryTime) - new Date(previousTrade.exitTime);
		analysis.timeSinceLastTrade = Math.max(0, Math.round(gapMs / 60000));

		// Rule 1: Revenge Trade (Re-entered within 3 mins of a LOSS with equal or higher size)
		if (
			previousTrade.result === "LOSS" &&
			analysis.timeSinceLastTrade <= 3 &&
			trade.totalQuantity >= previousTrade.totalQuantity
		) {
			analysis.isRevengeTrade = true;
			analysis.behavioralTags.push("REVENGE_ENTRY");
		}
	}

	// Rule 2: Size Spike (Check if position size is > 2x recent median size)
	const recentTrades = await Trade.find({
		user: trade.user,
		account: trade.account,
		_id: { $ne: trade._id },
	})
		.sort({ entryTime: -1 })
		.limit(10)
		.session(session)
		.lean();

	if (recentTrades.length >= 3) {
		const avgSize =
			recentTrades.reduce((acc, t) => acc + t.totalQuantity, 0) / recentTrades.length;

		if (trade.totalQuantity >= avgSize * 2) {
			analysis.isSizeSpike = true;
			analysis.behavioralTags.push("ELEVATED_RISK");
		}
	}

	return analysis;
}



// 3. FIFO MATCHING & TRADE PROCESSING LOGIC

function addExecutionToTrade(trade, execution) {
	if (!trade.executions.some((executionId) => executionId.equals(execution._id))) {
		trade.executions.push(execution._id);
	}
}

/**
 * Updates derived monetary and system metrics on the trade instance.
 */
function updateTradeMetrics(trade) {
	trade.totalFees = round(trade.entryFees + trade.exitFees);
	trade.realizedFees = round(trade.realizedEntryFees + trade.exitFees);
	trade.result = calculateResult(trade.status, trade.realizedPnl);

	if (trade.status !== "CLOSED" || !trade.exitTime) {
		trade.holdingPeriod = 0;
		return;
	}

	trade.holdingPeriod = calculateHoldingPeriod(trade.entryTime, trade.exitTime);
}

/**
 * Rebuilds weighted-average trades from chronological broker executions using FIFO.
 */
export async function processExecutionsFIFO(userId, accountId, options = {}) {
	const ownsSession = !options.session;
	const session = options.session || (await mongoose.startSession());
	let transactionStarted = false;

	if (ownsSession) {
		try {
			session.startTransaction();
			transactionStarted = true;
		} catch (err) {
			// Standalone MongoDB setup
		}
	}

	const queryOptions = session ? { session } : {};

	try {
		const pendingExecutions = await Execution.find({
			user: userId,
			account: accountId,
			processed: false,
		})
			.sort({ executionTime: 1, _id: 1 })
			.session(session);

		if (!pendingExecutions.length) {
			if (transactionStarted) await session.commitTransaction();
			return { processedCount: 0, status: "SUCCESS" };
		}

		const executionsBySymbol = pendingExecutions.reduce((groups, execution) => {
			(groups[execution.symbol] ||= []).push(execution);
			return groups;
		}, {});

		for (const [symbol, executions] of Object.entries(executionsBySymbol)) {
			const openTrades = await Trade.find({
				user: userId,
				account: accountId,
				symbol,
				status: { $in: ["OPEN", "PARTIAL"] },
			})
				.sort({ entryTime: 1, _id: 1 })
				.session(session);

			for (const execution of executions) {
				let remainingQuantity = execution.quantity;
				let remainingFees = execution.fees || 0;
				const executionDirection =
					execution.transactionType === "BUY" ? "LONG" : "SHORT";

				while (remainingQuantity > 0) {
					const activeTrade = openTrades[0];

					// 1. OPEN NEW POSITION
					if (!activeTrade) {
						const newTrade = new Trade({
							user: userId,
							account: accountId,
							symbol,
							direction: executionDirection,
							status: "OPEN",
							totalQuantity: remainingQuantity,
							openQuantity: remainingQuantity,
							avgEntryPrice: execution.price,
							entryTime: execution.executionTime,
							executions: [execution._id],
							entryFees: remainingFees,
							totalFees: remainingFees,
						});

						// Derive initial behavioral tags
						const behavior = await deriveBehavioralMetrics(newTrade, session);
						newTrade.behavioralAnalysis = behavior;

						updateTradeMetrics(newTrade);
						await newTrade.save(queryOptions);
						openTrades.push(newTrade);

						remainingQuantity = 0;
						remainingFees = 0;
						continue;
					}

					// 2. ADD TO EXISTING POSITION (Scale In / Averaging Down)
					if (activeTrade.direction === executionDirection) {
						activeTrade.behavioralAnalysis ||= {
							isRevengeTrade: false,
							isAveragingDown: false,
							isSizeSpike: false,
							timeSinceLastTrade: null,
							behavioralTags: [],
						};

						const isUnfavorablePrice =
							activeTrade.direction === "LONG"
								? execution.price < activeTrade.avgEntryPrice
								: execution.price > activeTrade.avgEntryPrice;

						if (isUnfavorablePrice) {
							activeTrade.behavioralAnalysis.isAveragingDown = true;
							if (!activeTrade.behavioralAnalysis.behavioralTags.includes("AVERAGING_DOWN")) {
								activeTrade.behavioralAnalysis.behavioralTags.push("AVERAGING_DOWN");
							}
						}

						const newOpenQuantity = activeTrade.openQuantity + remainingQuantity;
						activeTrade.avgEntryPrice = round(
							(activeTrade.avgEntryPrice * activeTrade.openQuantity +
								execution.price * remainingQuantity) /
							newOpenQuantity
						);
						activeTrade.totalQuantity += remainingQuantity;
						activeTrade.openQuantity = newOpenQuantity;
						activeTrade.entryFees = round(activeTrade.entryFees + remainingFees);

						addExecutionToTrade(activeTrade, execution);
						updateTradeMetrics(activeTrade);

						await activeTrade.save(queryOptions);
						remainingQuantity = 0;
						remainingFees = 0;
						continue;
					}

					// 3. CLOSE / PARTIAL CLOSE POSITION (Scale Out)
					const matchedQuantity = Math.min(activeTrade.openQuantity, remainingQuantity);
					const closingFee =
						(execution.fees || 0) * (matchedQuantity / execution.quantity);
					const alreadyClosedQuantity = activeTrade.totalQuantity - activeTrade.openQuantity;
					const newClosedQuantity = alreadyClosedQuantity + matchedQuantity;

					const grossPnlPerUnit =
						activeTrade.direction === "LONG"
							? execution.price - activeTrade.avgEntryPrice
							: activeTrade.avgEntryPrice - execution.price;

					const unrecognizedEntryFees =
						activeTrade.entryFees - activeTrade.realizedEntryFees;
					const entryFeeForMatch =
						(unrecognizedEntryFees * matchedQuantity) / activeTrade.openQuantity;

					activeTrade.avgExitPrice = round(
						((activeTrade.avgExitPrice || 0) * alreadyClosedQuantity +
							execution.price * matchedQuantity) /
						newClosedQuantity
					);
					activeTrade.openQuantity -= matchedQuantity;
					activeTrade.realizedEntryFees = round(
						activeTrade.realizedEntryFees + entryFeeForMatch
					);
					activeTrade.exitFees = round(activeTrade.exitFees + closingFee);
					activeTrade.realizedPnl = round(
						activeTrade.realizedPnl +
						grossPnlPerUnit * matchedQuantity -
						entryFeeForMatch -
						closingFee
					);
					addExecutionToTrade(activeTrade, execution);

					if (activeTrade.openQuantity === 0) {
						activeTrade.status = "CLOSED";
						activeTrade.exitTime = execution.executionTime;
						openTrades.shift();
					} else {
						activeTrade.status = "PARTIAL";
						activeTrade.exitTime = null;
					}

					updateTradeMetrics(activeTrade);
					await activeTrade.save(queryOptions);

					remainingQuantity -= matchedQuantity;
					remainingFees = round(remainingFees - closingFee);
				}

				execution.processed = true;
				execution.processedAt = new Date();
				await execution.save(queryOptions);
			}
		}

		if (transactionStarted) await session.commitTransaction();
		return { processedCount: pendingExecutions.length, status: "SUCCESS" };
	} catch (error) {
		if (transactionStarted) await session.abortTransaction();
		throw error;
	} finally {
		if (ownsSession) session.endSession();
	}
}