import mongoose, { Schema } from "mongoose";

// for multiple brokers, but for now only upstox

const accountSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        broker: {
            type: String,
            enum: ["upstox", "zerodha", "groww"], // add more brokers here later
            required: true,
        },
        accountName: {
            type: String, // user-facing label, e.g. "My Upstox Account"
            trim: true,
        },
        brokerUserId: {
            type: String, // the account/client ID Upstox assigns, distinct from your own User._id
        },

        //Auth tokens (broker-specific, encrypted at rest ideally)
        accessToken: {
            type: String,
            select: false, // don't return by default on normal queries
        },
        refreshToken: {
            type: String,
            select: false,
        },
        tokenExpiresAt: {
            type: Date,
        },

        //Connection status
        isActive: {
            type: Boolean,
            default: true, //false if user disconnects, or token permanently invalid
        },
        lastSyncedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

//One user shouldn't connect the same broker account twice
accountSchema.index({ user: 1, broker: 1, brokerUserId: 1 }, { unique: true });

export const Account = mongoose.model("Account", accountSchema);