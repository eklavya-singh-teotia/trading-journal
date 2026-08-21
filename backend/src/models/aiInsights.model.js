import mongoose, { Schema } from "mongoose";

const aiInsightsSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		account: {
			type: Schema.Types.ObjectId,
			ref: "Account",
			default: null,
		},
		startDate: {
			type: Date,
			default: null,
		},
		endDate: {
			type: Date,
			default: null,
		},
		aiInsights: {
			psychologicalSummary: { type: String, default: "" },
			strengths: [{ type: String }],
			vulnerabilities: [{ type: String }],
			actionableRules: [{ type: String }],
		},
		tradeCount: {
			type: Number,
			default: 0,
		},
		lastTradeTimestamp: {
			type: Date,
			default: null,
		},
		modelUsed: {
			type: String,
			default: "",
		},
		generatedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true }
);

aiInsightsSchema.index({ user: 1, account: 1, startDate: 1, endDate: 1 });

export const AIInsights = mongoose.model("AIInsights", aiInsightsSchema);
