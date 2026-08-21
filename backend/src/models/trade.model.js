import mongoose, { Schema } from "mongoose";

const tradeSchema = new Schema(
	{
		//Linking & Accounts
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		account: {
			type: Schema.Types.ObjectId,
			ref: "Account",
			required: true,
		},
		executions: [
			{
				type: Schema.Types.ObjectId,
				ref: "Execution",
			},
		],

		//Core Position Details
		symbol: {
			type: String,
			required: true,
			uppercase: true,
			index: true,
		},
		direction: {
			type: String,
			enum: ["LONG", "SHORT"],
			required: true,
		},
		status: {
			type: String,
			enum: ["OPEN", "PARTIAL", "CLOSED"],
			default: "OPEN",
		},

		//Quantities & Pricing
		totalQuantity: {
			type: Number,
			required: true,
			min: 1,
		},
		openQuantity: {
			type: Number,
			required: true,
			min: 0,
		},
		avgEntryPrice: {
			type: Number,
			required: true,
			min: 0,
		},
		avgExitPrice: {
			type: Number,
			default: null,
		},

		entryTime: {
			type: Date,
			required: true,
			index: true,
		},
		exitTime: {
			type: Date,
			default: null,
		},

		// System Calculated Financial Metrics 
		realizedPnl: {
			type: Number,
			default: 0,
		},
		totalFees: {
			type: Number,
			default: 0,
		},
		entryFees: {
			type: Number,
			default: 0,
		},
		realizedEntryFees: {
			type: Number,
			default: 0,
		},
		exitFees: {
			type: Number,
			default: 0,
		},
		realizedFees: {
			type: Number,
			default: 0,
		},
		holdingPeriod: {
			type: Number, // in minutes
			default: 0,
		},
		result: {
			type: String,
			enum: ["OPEN", "WIN", "LOSS", "BREAKEVEN"],
			default: "OPEN",
		},

		//User Journaling & Strategy Fields
		stopLoss: {
			type: Number,
			default: null,
		},
		targetPrice: {
			type: Number,
			default: null,
		},
		rr: {
			type: Number,
			default: null,
		},
		strategy: {
			type: String,
			default: "",
			trim: true,
		},
		timeframe: {
			type: String,
			default: "",
			trim: true,
		},
		notes: {
			type: String,
			default: "",
		},
		tags: [
			{
				type: String,
				trim: true,
			},
		],
		journal: {
			setup: { type: String, default: "" },
			rating: { type: Number, min: 1, max: 5, default: null },
			lessons: { type: String, default: "" },
			emotions: { type: String, default: "" },
		},

		//Algorithmic Behavioral Analysis
		behavioralAnalysis: {
			isRevengeTrade: { type: Boolean, default: false },
			isAveragingDown: { type: Boolean, default: false },
			isSizeSpike: { type: Boolean, default: false },
			timeSinceLastTrade: { type: Number, default: null },
			behavioralTags: [{ type: String }],
		},
	},
	{
		timestamps: true,
	}
);
tradeSchema.index({ user: 1, account: 1, entryTime: -1 });
tradeSchema.index({ user: 1, status: 1, result: 1 });

export const Trade = mongoose.model("Trade", tradeSchema);