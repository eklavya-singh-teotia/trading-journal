import mongoose, { Schema } from "mongoose";

const executionSchema = new Schema(
    {
        user: { 
            type: Schema.Types.ObjectId, 
            ref: "User", 
            required: true, 
            index: true 
        },
        account: { 
            type: Schema.Types.ObjectId, 
            ref: "Account", 
            required: true, 
            index: true 
        },
        // Processing metadata is separate from a trade relationship because one
        // execution can close one trade and open another.
        processed: {
            type: Boolean,
            default: false,
            index: true,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        importJob: { 
            type: Schema.Types.ObjectId, 
            ref: "ImportJob", 
            default: null 
        },

        //Broker Identifiers
        brokerExecutionId: { 
            type: String, 
            required: true 
        }, // Upstox trade_id from CSV/API
        orderId: { 
            type: String, 
            default: null 
        },
        source: { 
            type: String, 
            enum: ["UPSTOX_API", "UPSTOX_CSV", "ZERODHA_API", "ZERODHA_CSV", "GROWW_API", "GROWW_CSV", "MANUAL"], 
            required: true 
        },

        //Asset Data
        symbol: { 
            type: String, 
            required: true, 
            uppercase: true,
            trim: true 
        }, // e.g., "RELIANCE"
        instrumentToken: { 
            type: String 
        },
        exchange: { 
            type: String, 
            enum: ["NSE", "BSE", "NFO", "MCX", "CDS"], 
            required: true 
        },
        segment: { 
            type: String, 
            enum: ["EQ", "FO", "CD", "COM"], 
            default: "EQ" 
        },

        //Execution Details
        transactionType: { 
            type: String, 
            enum: ["BUY", "SELL"], 
            required: true 
        },
        product: { 
            type: String, 
            enum: ["INTRADAY", "DELIVERY", "MTF", "CO", "OCO"] 
        },
        quantity: { 
            type: Number, 
            required: true, 
            min: 1 
        },
        price: { 
            type: Number, 
            required: true, 
            min: 0 
        },
        executionTime: { 
            type: Date, 
            required: true, 
            index: true 
        },
        
        fees: { 
            type: Number, 
            default: 0 
        },
        rawPayload: { 
            type: Schema.Types.Mixed, 
            select: false 
        }, // Stores raw CSV row text for auditing
    },
    { 
        timestamps: true 
    }
);

// Prevent duplicate imports: Account ID + Broker Execution ID must be unique
executionSchema.index({ account: 1, brokerExecutionId: 1 }, { unique: true });
executionSchema.index({ user: 1, account: 1, processed: 1, executionTime: 1 });

export const Execution = mongoose.model("Execution", executionSchema);
