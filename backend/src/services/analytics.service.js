import mongoose from "mongoose";
import { Trade } from "../models/trade.model.js";
import { AIInsights } from "../models/aiInsights.model.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

//round to 2 decimal places
const round = (num, decimals = 2) => {
	if (num == null || isNaN(num)) return 0;
	return Number(Math.round(Number(num + "e" + decimals)) + "e-" + decimals);
};

/**
 * Builds the base MongoDB query filter based on parameters.
 */
function buildQueryFilter(userId, accountId, startDate, endDate) {
	const query = { user: userId };

	if (accountId && mongoose.isValidObjectId(accountId)) {
		query.account = accountId;
	}

	if (startDate || endDate) {
		query.entryTime = {};
		if (startDate) query.entryTime.$gte = new Date(startDate);
		if (endDate) query.entryTime.$lte = new Date(endDate);
	}

	return query;
}

/**
 * Calculates top-level quantitative trading analytics summary.
 */
export async function getAnalyticsSummary(userId, accountId = null, startDate = null, endDate = null) {
	const query = buildQueryFilter(userId, accountId, startDate, endDate);
	const trades = await Trade.find(query).sort({ entryTime: 1 }).lean();

	const totalTrades = trades.length;
	if (totalTrades === 0) {
		return {
			totalTrades: 0,
			closedTrades: 0,
			openTrades: 0,
			winningTrades: 0,
			losingTrades: 0,
			breakevenTrades: 0,
			winRate: 0,
			lossRate: 0,
			netPnl: 0,
			grossProfit: 0,
			grossLoss: 0,
			profitFactor: 0,
			avgWin: 0,
			avgLoss: 0,
			winLossRatio: 0,
			expectancy: 0,
			totalFees: 0,
			avgHoldingPeriod: 0,
			avgWinnerHoldingPeriod: 0,
			avgLoserHoldingPeriod: 0,
			maxDrawdown: 0,
			maxDrawdownPercent: 0,
		};
	}

	let closedTradesCount = 0;
	let openTradesCount = 0;
	let winningTradesCount = 0;
	let losingTradesCount = 0;
	let breakevenTradesCount = 0;

	let grossProfit = 0;
	let grossLoss = 0;
	let netPnl = 0;
	let totalFees = 0;

	let totalHoldingPeriod = 0;
	let winnerHoldingPeriod = 0;
	let loserHoldingPeriod = 0;

	trades.forEach((trade) => {
		totalFees += trade.realizedFees ?? trade.totalFees ?? 0;

		if (trade.status === "CLOSED" || trade.result !== "OPEN") {
			closedTradesCount++;
			const pnl = trade.realizedPnl || 0;
			netPnl += pnl;

			const hp = trade.holdingPeriod || 0;
			totalHoldingPeriod += hp;

			if (trade.result === "WIN" || pnl > 0) {
				winningTradesCount++;
				grossProfit += pnl;
				winnerHoldingPeriod += hp;
			} else if (trade.result === "LOSS" || pnl < 0) {
				losingTradesCount++;
				grossLoss += Math.abs(pnl);
				loserHoldingPeriod += hp;
			} else {
				breakevenTradesCount++;
			}
		} else {
			openTradesCount++;
		}
	});

	const winRate = closedTradesCount > 0 ? round((winningTradesCount / closedTradesCount) * 100) : 0;
	const lossRate = closedTradesCount > 0 ? round((losingTradesCount / closedTradesCount) * 100) : 0;

	const avgWin = winningTradesCount > 0 ? round(grossProfit / winningTradesCount) : 0;
	const avgLoss = losingTradesCount > 0 ? round(grossLoss / losingTradesCount) : 0;
	const profitFactor = grossLoss > 0 ? round(grossProfit / grossLoss) : grossProfit > 0 ? round(grossProfit) : 0;
	const winLossRatio = avgLoss > 0 ? round(avgWin / avgLoss) : 0;

	const winProb = winRate / 100;
	const lossProb = lossRate / 100;
	const expectancy = round(winProb * avgWin - lossProb * avgLoss);

	const avgHoldingPeriod = closedTradesCount > 0 ? round(totalHoldingPeriod / closedTradesCount) : 0;
	const avgWinnerHoldingPeriod = winningTradesCount > 0 ? round(winnerHoldingPeriod / winningTradesCount) : 0;
	const avgLoserHoldingPeriod = losingTradesCount > 0 ? round(loserHoldingPeriod / losingTradesCount) : 0;

	// Max Drawdown calculation from running cumulative PnL
	let peakPnl = 0;
	let maxDrawdown = 0;
	let runningPnl = 0;

	trades.forEach((trade) => {
		if (trade.status === "CLOSED") {
			runningPnl += trade.realizedPnl || 0;
			if (runningPnl > peakPnl) {
				peakPnl = runningPnl;
			}
			const drawdown = peakPnl - runningPnl;
			if (drawdown > maxDrawdown) {
				maxDrawdown = drawdown;
			}
		}
	});

	const maxDrawdownPercent = peakPnl > 0 ? round((maxDrawdown / peakPnl) * 100) : 0;

	return {
		totalTrades,
		closedTrades: closedTradesCount,
		openTrades: openTradesCount,
		winningTrades: winningTradesCount,
		losingTrades: losingTradesCount,
		breakevenTrades: breakevenTradesCount,
		winRate,
		lossRate,
		netPnl: round(netPnl),
		grossProfit: round(grossProfit),
		grossLoss: round(grossLoss),
		profitFactor,
		avgWin,
		avgLoss,
		winLossRatio,
		expectancy,
		totalFees: round(totalFees),
		avgHoldingPeriod,
		avgWinnerHoldingPeriod,
		avgLoserHoldingPeriod,
		maxDrawdown: round(maxDrawdown),
		maxDrawdownPercent,
	};
}

/**
 * Calculates daily aggregated PnL and cumulative equity curve.
 */
export async function getDailyPnl(userId, accountId = null, startDate = null, endDate = null) {
	const query = buildQueryFilter(userId, accountId, startDate, endDate);
	query.status = "CLOSED";

	const trades = await Trade.find(query).sort({ entryTime: 1 }).lean();

	const dailyMap = {};

	trades.forEach((trade) => {
		const dateKey = new Date(trade.entryTime).toISOString().split("T")[0];
		if (!dailyMap[dateKey]) {
			dailyMap[dateKey] = {
				date: dateKey,
				pnl: 0,
				fees: 0,
				tradesCount: 0,
				winCount: 0,
				lossCount: 0,
			};
		}

		const pnl = trade.realizedPnl || 0;
		dailyMap[dateKey].pnl += pnl;
		dailyMap[dateKey].fees += trade.realizedFees ?? trade.totalFees ?? 0;
		dailyMap[dateKey].tradesCount += 1;
		if (trade.result === "WIN" || pnl > 0) {
			dailyMap[dateKey].winCount += 1;
		} else if (trade.result === "LOSS" || pnl < 0) {
			dailyMap[dateKey].lossCount += 1;
		}
	});

	let runningCumulativePnl = 0;
	const result = Object.keys(dailyMap)
		.sort()
		.map((date) => {
			const dayData = dailyMap[date];
			dayData.pnl = round(dayData.pnl);
			dayData.fees = round(dayData.fees);
			runningCumulativePnl += dayData.pnl;
			dayData.cumulativePnl = round(runningCumulativePnl);
			dayData.winRate = dayData.tradesCount > 0 ? round((dayData.winCount / dayData.tradesCount) * 100) : 0;
			return dayData;
		});

	return result;
}

/**
 * Calculates breakdowns by Symbol, Day of Week, Time of Day, and Strategy.
 */
export async function getAnalyticsBreakdown(userId, accountId = null, startDate = null, endDate = null) {
	const query = buildQueryFilter(userId, accountId, startDate, endDate);
	const trades = await Trade.find(query).lean();

	const bySymbol = {};
	const byDayOfWeek = {
		Monday: { day: "Monday", tradesCount: 0, winCount: 0, pnl: 0 },
		Tuesday: { day: "Tuesday", tradesCount: 0, winCount: 0, pnl: 0 },
		Wednesday: { day: "Wednesday", tradesCount: 0, winCount: 0, pnl: 0 },
		Thursday: { day: "Thursday", tradesCount: 0, winCount: 0, pnl: 0 },
		Friday: { day: "Friday", tradesCount: 0, winCount: 0, pnl: 0 },
		Saturday: { day: "Saturday", tradesCount: 0, winCount: 0, pnl: 0 },
		Sunday: { day: "Sunday", tradesCount: 0, winCount: 0, pnl: 0 },
	};
	const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

	const byTimeOfDay = {
		"09:15 - 10:00": { window: "09:15 - 10:00", tradesCount: 0, winCount: 0, pnl: 0 },
		"10:00 - 11:30": { window: "10:00 - 11:30", tradesCount: 0, winCount: 0, pnl: 0 },
		"11:30 - 13:30": { window: "11:30 - 13:30", tradesCount: 0, winCount: 0, pnl: 0 },
		"13:30 - 15:30": { window: "13:30 - 15:30", tradesCount: 0, winCount: 0, pnl: 0 },
		Other: { window: "Other", tradesCount: 0, winCount: 0, pnl: 0 },
	};

	const byStrategy = {};

	trades.forEach((trade) => {
		const pnl = trade.realizedPnl || 0;
		const isWin = trade.result === "WIN" || pnl > 0;

		// 1. By Symbol
		const sym = trade.symbol || "UNKNOWN";
		if (!bySymbol[sym]) {
			bySymbol[sym] = { symbol: sym, tradesCount: 0, winCount: 0, pnl: 0, totalQuantity: 0 };
		}
		bySymbol[sym].tradesCount += 1;
		if (isWin) bySymbol[sym].winCount += 1;
		bySymbol[sym].pnl += pnl;
		bySymbol[sym].totalQuantity += trade.totalQuantity || 0;

		// 2. By Day of Week
		if (trade.entryTime) {
			const d = new Date(trade.entryTime);
			const dayName = dayNames[d.getDay()];
			if (byDayOfWeek[dayName]) {
				byDayOfWeek[dayName].tradesCount += 1;
				if (isWin) byDayOfWeek[dayName].winCount += 1;
				byDayOfWeek[dayName].pnl += pnl;
			}
		}

		// 3. By Time of Day (IST / standard market hours)
		if (trade.entryTime) {
			// Convert UTC trade.entryTime to IST (+5:30 = 330 minutes)
			const istDate = new Date(new Date(trade.entryTime).getTime() + 330 * 60 * 1000);
			const hours = istDate.getUTCHours();
			const minutes = istDate.getUTCMinutes();
			const timeInMinutes = hours * 60 + minutes;

			// 9:15 = 555 mins, 10:00 = 600 mins, 11:30 = 690 mins, 13:30 = 810 mins, 15:30 = 930 mins
			let windowKey = "Other";
			if (timeInMinutes >= 555 && timeInMinutes < 600) windowKey = "09:15 - 10:00";
			else if (timeInMinutes >= 600 && timeInMinutes < 690) windowKey = "10:00 - 11:30";
			else if (timeInMinutes >= 690 && timeInMinutes < 810) windowKey = "11:30 - 13:30";
			else if (timeInMinutes >= 810 && timeInMinutes <= 930) windowKey = "13:30 - 15:30";

			byTimeOfDay[windowKey].tradesCount += 1;
			if (isWin) byTimeOfDay[windowKey].winCount += 1;
			byTimeOfDay[windowKey].pnl += pnl;
		}

		// 4. By Strategy
		const strat = trade.strategy || "Uncategorized";
		if (!byStrategy[strat]) {
			byStrategy[strat] = { strategy: strat, tradesCount: 0, winCount: 0, pnl: 0 };
		}
		byStrategy[strat].tradesCount += 1;
		if (isWin) byStrategy[strat].winCount += 1;
		byStrategy[strat].pnl += pnl;
	});

	// Format array results with win rates and rounded PnL
	const formatList = (dict, keyName) =>
		Object.values(dict)
			.filter((item) => item.tradesCount > 0)
			.map((item) => ({
				...item,
				pnl: round(item.pnl),
				winRate: item.tradesCount > 0 ? round((item.winCount / item.tradesCount) * 100) : 0,
			}));

	return {
		bySymbol: formatList(bySymbol, "symbol"),
		byDayOfWeek: Object.values(byDayOfWeek).map((item) => ({
			...item,
			pnl: round(item.pnl),
			winRate: item.tradesCount > 0 ? round((item.winCount / item.tradesCount) * 100) : 0,
		})),
		byTimeOfDay: Object.values(byTimeOfDay).map((item) => ({
			...item,
			pnl: round(item.pnl),
			winRate: item.tradesCount > 0 ? round((item.winCount / item.tradesCount) * 100) : 0,
		})),
		byStrategy: formatList(byStrategy, "strategy"),
	};
}


const round2 = (num, decimals = 2) => {
	if (num == null || isNaN(num)) return 0;
	return Number(Math.round(Number(num + "e" + decimals)) + "e-" + decimals);
};

/**
 * Calculates algorithmic behavioral & psychological trading metrics.
 */
export async function getBehavioralMetrics(userId, accountId = null, startDate = null, endDate = null) {
	const query = { user: userId };

	if (accountId && mongoose.isValidObjectId(accountId)) {
		query.account = accountId;
	}

	if (startDate || endDate) {
		query.entryTime = {};
		if (startDate) query.entryTime.$gte = new Date(startDate);
		if (endDate) query.entryTime.$lte = new Date(endDate);
	}

	const trades = await Trade.find(query).sort({ entryTime: 1 }).lean();
	const summary = await getAnalyticsSummary(userId, accountId, startDate, endDate);
	const dailyPnlList = await getDailyPnl(userId, accountId, startDate, endDate);

	const totalTrades = trades.length;
	if (totalTrades === 0) {
		return {
			behaviorScore: 100,
			totalTrades: 0,
			revengeTrades: { count: 0, rate: 0, netPnl: 0 },
			averagingDown: { count: 0, rate: 0, netPnl: 0 },
			sizeSpikes: { count: 0, rate: 0, netPnl: 0 },
			holdingPattern: {
				avgWinMinutes: 0,
				avgLossMinutes: 0,
				holdingRatio: 1,
				flag: "HEALTHY",
			},
			overtradingDaysCount: 0,
			postLossWinRate: 0,
			postWinWinRate: 0,
			topVulnerability: "Insufficient trade data",
			ruleViolations: [],
		};
	}

	// 1. Revenge Trading Analysis
	let revengeCount = 0;
	let revengePnl = 0;

	// 2. Averaging Down Analysis
	let averagingDownCount = 0;
	let averagingDownPnl = 0;

	// 3. Size Spikes Analysis
	let sizeSpikeCount = 0;
	let sizeSpikePnl = 0;

	// 4. Post-Loss vs Post-Win Performance
	let postLossTradesCount = 0;
	let postLossWins = 0;
	let postWinTradesCount = 0;
	let postWinWins = 0;

	for (let i = 0; i < trades.length; i++) {
		const trade = trades[i];
		const b = trade.behavioralAnalysis || {};
		const pnl = trade.realizedPnl || 0;

		if (b.isRevengeTrade) {
			revengeCount++;
			revengePnl += pnl;
		}

		if (b.isAveragingDown) {
			averagingDownCount++;
			averagingDownPnl += pnl;
		}

		if (b.isSizeSpike) {
			sizeSpikeCount++;
			sizeSpikePnl += pnl;
		}

		// Check performance immediately following previous trade result
		if (i > 0) {
			const prevTrade = trades[i - 1];
			if (prevTrade.result === "LOSS") {
				postLossTradesCount++;
				if (trade.result === "WIN" || pnl > 0) postLossWins++;
			} else if (prevTrade.result === "WIN") {
				postWinTradesCount++;
				if (trade.result === "WIN" || pnl > 0) postWinWins++;
			}
		}
	}

	// 5. Holding Ratio
	const avgWinMinutes = summary.avgWinnerHoldingPeriod || 0;
	const avgLossMinutes = summary.avgLoserHoldingPeriod || 0;
	const holdingRatio = avgWinMinutes > 0 ? round(avgLossMinutes / avgWinMinutes) : avgLossMinutes > 0 ? 2 : 1;

	let holdingFlag = "HEALTHY";
	if (avgLossMinutes > avgWinMinutes * 1.5 && avgLossMinutes > 15) {
		holdingFlag = "HOLDING_LOSERS_TOO_LONG";
	} else if (avgWinMinutes > avgLossMinutes * 1.5) {
		holdingFlag = "LETTING_WINNERS_RUN";
	}

	// 6. Overtrading Analysis
	const avgDailyTrades = dailyPnlList.length > 0 ? totalTrades / dailyPnlList.length : 0;
	const overtradingDaysCount = dailyPnlList.filter((d) => d.tradesCount >= Math.max(5, avgDailyTrades * 1.8)).length;

	const postLossWinRate = postLossTradesCount > 0 ? round((postLossWins / postLossTradesCount) * 100) : 0;
	const postWinWinRate = postWinTradesCount > 0 ? round((postWinWins / postWinTradesCount) * 100) : 0;

	// 7. Calculate Behavioral Discipline Score (0 to 100)
	let score = 100;
	const ruleViolations = [];

	const revengeRate = round((revengeCount / totalTrades) * 100);
	if (revengeRate > 0) {
		const penalty = Math.min(30, revengeRate * 1.5);
		score -= penalty;
		ruleViolations.push(`Revenge trading detected in ${revengeRate}% of trades.`);
	}

	const avgDownRate = round((averagingDownCount / totalTrades) * 100);
	if (avgDownRate > 10) {
		const penalty = Math.min(20, (avgDownRate - 10) * 1.2);
		score -= penalty;
		ruleViolations.push(`Averaging down into losing positions in ${avgDownRate}% of trades.`);
	}

	if (holdingFlag === "HOLDING_LOSERS_TOO_LONG") {
		score -= 15;
		ruleViolations.push(
			`Holding losers (avg ${avgLossMinutes} mins) significantly longer than winners (avg ${avgWinMinutes} mins).`
		);
	}

	const sizeSpikeRate = round((sizeSpikeCount / totalTrades) * 100);
	if (sizeSpikeRate > 15) {
		score -= 15;
		ruleViolations.push(`Uncontrolled position sizing (size spikes) in ${sizeSpikeRate}% of trades.`);
	}

	if (overtradingDaysCount > 0) {
		score -= Math.min(15, overtradingDaysCount * 5);
		ruleViolations.push(`Overtrading activity on ${overtradingDaysCount} trading days.`);
	}

	score = Math.max(0, Math.round(score));

	// Determine top psychological vulnerability
	let topVulnerability = "Disciplined Execution";
	if (revengeCount > 0 && revengePnl < 0) {
		topVulnerability = "Revenge Trading & Emotional Impulsivity";
	} else if (holdingFlag === "HOLDING_LOSERS_TOO_LONG") {
		topVulnerability = "Reluctance to Accept Losses (Holding Losers)";
	} else if (sizeSpikeCount > 0 && sizeSpikePnl < 0) {
		topVulnerability = "Erratic Position Sizing (Risk Overexposure)";
	} else if (postLossWinRate < summary.winRate - 15) {
		topVulnerability = "Tilt / Deterioration after Loss";
	}

	return {
		behaviorScore: score,
		totalTrades,
		revengeTrades: {
			count: revengeCount,
			rate: revengeRate,
			netPnl: round(revengePnl),
		},
		averagingDown: {
			count: averagingDownCount,
			rate: avgDownRate,
			netPnl: round(averagingDownPnl),
		},
		sizeSpikes: {
			count: sizeSpikeCount,
			rate: sizeSpikeRate,
			netPnl: round(sizeSpikePnl),
		},
		holdingPattern: {
			avgWinMinutes,
			avgLossMinutes,
			holdingRatio,
			flag: holdingFlag,
		},
		overtradingDaysCount,
		postLossWinRate,
		postWinWinRate,
		topVulnerability,
		ruleViolations,
	};
}

/**
 * Resolves an active, supported Gemini model for content generation.
 */
export async function getActiveGeminiModel(apiKey) {
	const candidateModels = [
		process.env.GEMINI_MODEL,
		"gemini-3.6-flash",
		"gemini-3.5-flash",
		"gemini-3.7-flash",
		"gemini-flash-latest",
	].filter(Boolean);

	const uniqueCandidates = [...new Set(candidateModels)];

	try {
		const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
			headers: {
				"x-goog-api-key": apiKey,
			},
		});
		if (response.ok) {
			const data = await response.json();
			const availableNames = (data.models || [])
				.filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
				.map((m) => m.name.replace("models/", ""));

			for (const candidate of uniqueCandidates) {
				if (availableNames.includes(candidate)) {
					return candidate;
				}
			}
		}
	} catch (err) {
		console.warn("Could not fetch Gemini model list:", err.message);
	}

	return uniqueCandidates[0] || "gemini-3.6-flash";
}

/**
 * Fast behavioral analysis (GET /api/v1/analytics/behavior).
 * Calculates rule-based metrics (<50ms) and queries MongoDB for saved AI Insights.
 * Checks tradeCount & lastTradeTimestamp to flag isStale. Zero Gemini API calls.
 */
export async function getBehavioralAnalysis(userId, accountId = null, startDate = null, endDate = null) {
	const metrics = await getBehavioralMetrics(userId, accountId, startDate, endDate);

	const query = buildQueryFilter(userId, accountId, startDate, endDate);
	const trades = await Trade.find(query).sort({ entryTime: -1 }).select("entryTime").lean();
	const currentTradeCount = trades.length;
	const latestTradeTime = trades[0]?.entryTime ? new Date(trades[0].entryTime).getTime() : null;

	const filter = {
		user: userId,
		account: accountId && mongoose.isValidObjectId(accountId) ? accountId : null,
		startDate: startDate ? new Date(startDate) : null,
		endDate: endDate ? new Date(endDate) : null,
	};

	const savedRecord = await AIInsights.findOne(filter).sort({ generatedAt: -1 }).lean();

	if (savedRecord && savedRecord.aiInsights) {
		const savedCount = savedRecord.tradeCount ?? 0;
		const savedTimestamp = savedRecord.lastTradeTimestamp ? new Date(savedRecord.lastTradeTimestamp).getTime() : null;

		const isStale = savedCount !== currentTradeCount || savedTimestamp !== latestTradeTime;

		return {
			metrics,
			aiInsights: savedRecord.aiInsights,
			source: "GEMINI_AI_SAVED",
			modelUsed: savedRecord.modelUsed,
			generatedAt: savedRecord.generatedAt,
			isStale,
		};
	}

	return {
		metrics,
		aiInsights: null,
		source: "ALGORITHMIC_RULE_ENGINE",
		isStale: false,
	};
}

/**
 * On-demand AI Behavioral Insights Generation (POST /api/v1/analytics/behavior/generate).
 * Calls Gemini API, parses structured insights, and upserts into AIInsights MongoDB collection.
 */
export async function generateAndSaveAIBehavioralAnalysis(userId, accountId = null, startDate = null, endDate = null) {
	const metrics = await getBehavioralMetrics(userId, accountId, startDate, endDate);
	const summary = await getAnalyticsSummary(userId, accountId, startDate, endDate);

	const query = buildQueryFilter(userId, accountId, startDate, endDate);
	const trades = await Trade.find(query).sort({ entryTime: -1 }).select("entryTime").lean();
	const currentTradeCount = trades.length;
	const latestTradeTime = trades[0]?.entryTime ? new Date(trades[0].entryTime) : null;

	const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;

	if (!apiKey) {
		throw new Error("Gemini API key is not configured");
	}

const prompt = `
You are an expert trading psychologist and risk manager who helps intraday traders improve their performance and discipline.

Analyze the trader using ONLY the data provided below. Do not make up facts or assume things that are not supported by the data.

TRADER METRICS
----------------
Performance:
- Overall Win Rate: ${summary.winRate}%
- Winning Trades: ${summary.winningTrades}
- Losing Trades: ${summary.losingTrades}
- Net PnL: ₹${summary.netPnl}
- Profit Factor: ${summary.profitFactor}
- Total Fees: ₹${summary.totalFees}

Behavior:
- Behavioral Score: ${metrics.behaviorScore}/100
- Revenge Trades: ${metrics.revengeTrades.count} trades (${metrics.revengeTrades.rate}%)
- Revenge Trade PnL Impact: ₹${metrics.revengeTrades.netPnl}
- Averaging Down: ${metrics.averagingDown.count} trades (${metrics.averagingDown.rate}%)

Holding Behavior:
- Average Winning Trade Duration: ${metrics.holdingPattern.avgWinMinutes} minutes
- Average Losing Trade Duration: ${metrics.holdingPattern.avgLossMinutes} minutes
- Holding Ratio: ${metrics.holdingPattern.holdingRatio}

After-Trade Behavior:
- Post-Loss Win Rate: ${metrics.postLossWinRate}%
- Post-Win Win Rate: ${metrics.postWinWinRate}%

Known Problems:
- Main Weakness: ${metrics.topVulnerability}
- Rule Violations: ${metrics.ruleViolations.join("; ") || "None"}


ANALYSIS

1. OVERALL PERFORMANCE

Give a simple summary of how the trader is performing.

Explain:
- What is going well.
- What is going badly.
- Whether the trader is actually profitable.
- What is the biggest performance problem.

Do not just repeat the numbers. Explain what they mean.


2. TRADING BEHAVIOR

Look for important behavior patterns such as:
- Revenge trading
- Averaging down
- Taking too many trades
- Trading badly after a loss
- Trading badly after a win
- Taking profits too early
- Holding losing trades for too long
- Breaking trading rules

Only mention a problem if the data supports it.

Explain each problem in simple words.


3. WHY IS THIS HAPPENING?

For each major problem:

- Say what the problem is.
- Show the data that points to the problem.
- Explain how it can hurt the trader.
- Explain what the trader is doing wrong.

Do not use complicated psychological terms.


4. TOP 3 PROBLEMS

Choose the 3 most important problems.

Rank them from most important to least important.

For each problem give:

- Problem
- Evidence
- Severity: Critical / High / Medium / Low
- Why it matters

Focus on problems that are:
- Happening often
- Losing money
- Increasing risk
- Likely to cause more losses in the future


5. HOW TO IMPROVE

For every major problem, give a clear action the trader can take.

Each action should explain:

- What to change
- What rule to follow
- When to follow the rule
- What metric to track

Do not give vague advice like:
"Be disciplined."
"Control your emotions."
"Follow your strategy."

Give specific advice instead.

Example:
"After a losing trade, wait 10 minutes before taking another trade."


6. PERSONAL TRADING RULES

Create 3-5 simple rules specifically for this trader.

The rules must be based on their actual problems.

Make them:
- Simple
- Specific
- Measurable
- Easy to follow during live trading

Do not give generic trading advice.


7. NEXT TRADING SESSION

Give the trader a short checklist for their next trading session.

Include the most important things they should remember based on their current weaknesses.


8. FINAL VERDICT

End with:

- Overall assessment
- Biggest strength
- Biggest weakness
- Most important change to make
- One metric to focus on improving

Be honest. If the trader is making serious mistakes, say so clearly.

If the data is not enough to determine something, say:
"Not enough data to determine this."


COMMUNICATION STYLE
----------------
Speak directly to the trader using "you" and "your".

Use simple words and short sentences.

Be direct, professional, and honest.

Do not unnecessarily praise the trader.

Do not use complicated terms.

Do not give motivational speeches.

Do not repeat the input numbers without explaining what they mean.

Focus on:
1. What you are doing wrong.
2. Why it matters.
3. How much it is hurting you.
4. What you should do differently.

The goal is to help the trader make better decisions in their next trading session.
OUTPUT FORMAT
----------------

Keep the response concise.

Use clear headings and bullet points.

Do not write long paragraphs.

For each problem, keep the explanation to 2-4 sentences.

The entire analysis should normally fit on one screen of a trading dashboard.
`;

	const genAI = new GoogleGenerativeAI(apiKey);
	const preferredModel = await getActiveGeminiModel(apiKey);
	const modelsToTry = [
		...new Set([
			preferredModel,
			process.env.GEMINI_MODEL,
			"gemini-3.6-flash",
			"gemini-3.5-flash",
			"gemini-3.7-flash",
			"gemini-flash-latest",
		].filter(Boolean)),
	];

	let lastError = null;

	for (const modelName of modelsToTry) {
		try {
			const model = genAI.getGenerativeModel({
				model: modelName,
				generationConfig: {
					responseMimeType: "application/json",
					responseSchema: {
						type: "OBJECT",
						properties: {
							psychologicalSummary: { type: "STRING", description: "2-3 concise sentences assessing state of mind and core habits." },
							strengths: { type: "ARRAY", items: { type: "STRING" }, description: "List of 2 key trading strengths, written as 'You...'" },
							vulnerabilities: { type: "ARRAY", items: { type: "STRING" }, description: "List of 2 primary psychological vulnerabilities, written as 'You...'" },
							actionableRules: { type: "ARRAY", items: { type: "STRING" }, description: "List of 3 clear mandatory rules to follow" },
						},
						required: ["psychologicalSummary", "strengths", "vulnerabilities", "actionableRules"],
					},
				},
			});

			const result = await model.generateContent(prompt);
			let responseText = result.response.text();

			if (responseText) {
				responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
				const parsedAiInsights = JSON.parse(responseText);

				const filter = {
					user: userId,
					account: accountId && mongoose.isValidObjectId(accountId) ? accountId : null,
					startDate: startDate ? new Date(startDate) : null,
					endDate: endDate ? new Date(endDate) : null,
				};

				const updatedRecord = await AIInsights.findOneAndUpdate(
					filter,
					{
						aiInsights: parsedAiInsights,
						tradeCount: currentTradeCount,
						lastTradeTimestamp: latestTradeTime,
						modelUsed: modelName,
						generatedAt: new Date(),
					},
					{ upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
				);

				return {
					metrics,
					aiInsights: parsedAiInsights,
					source: "GEMINI_AI",
					modelUsed: modelName,
					generatedAt: updatedRecord.generatedAt,
					isStale: false,
				};
			}
		} catch (error) {
			lastError = error;
			console.warn(`Gemini API call failed with model ${modelName}:`, error.message || error);
		}
	}

	throw new Error(`Failed to generate AI insights: ${lastError?.message || "All models unavailable"}`);
}

/**
 * Fast algorithmic behavioral analysis (calculates discipline metrics & rule engine insights without AI API calls).
 */
export async function getRuleBasedBehavioralAnalysis(userId, accountId = null, startDate = null, endDate = null) {
	const metrics = await getBehavioralMetrics(userId, accountId, startDate, endDate);
	const summary = await getAnalyticsSummary(userId, accountId, startDate, endDate);

	const ruleBasedInsights = {
		psychologicalSummary:
			metrics.behaviorScore >= 80
				? "Demonstrates disciplined execution with tight risk controls. Emotional interference is minimal."
				: metrics.revengeTrades.count > 0
					? `Exhibits impulsive revenge trading tendencies after losses, causing ₹${Math.abs(
						metrics.revengeTrades.netPnl
					)} in unnecessary losses.`
					: "Trade frequency and holding duration suggest occasional deviation from risk management plan.",
		strengths: [
			summary.profitFactor >= 1.2 ? `Solid Profit Factor of ${summary.profitFactor}` : "Consistent trade tracking and execution logging",
			summary.winRate >= 50 ? `High base Win Rate of ${summary.winRate}%` : "Controlled position entry",
		],
		vulnerabilities:
			metrics.ruleViolations.length > 0
				? metrics.ruleViolations.slice(0, 2)
				: ["Keep monitoring stop-loss discipline on volatile instruments."],
		actionableRules: [
			metrics.revengeTrades.count > 0
				? "Implement a mandatory 15-minute cool-off period after any losing trade."
				: "Set clear Stop-Loss and Target levels before entering every order.",
			metrics.holdingPattern.flag === "HOLDING_LOSERS_TOO_LONG"
				? `Strictly cut losing positions when time exceeds average winner duration (${metrics.holdingPattern.avgWinMinutes} mins).`
				: "Never average down into a declining intraday position.",
			"Cap maximum daily trades to prevent overtrading and fee erosion.",
		],
	};

	return {
		metrics,
		aiInsights: ruleBasedInsights,
		source: "ALGORITHMIC_RULE_ENGINE",
	};
}
