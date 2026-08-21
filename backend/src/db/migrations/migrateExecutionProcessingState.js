import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../connectDB.js";
import { Execution } from "../../models/execution.model.js";

await connectDB();

// Old processed executions have a trade reference; old pending executions do not.
const result = await Execution.updateMany(
    { processed: { $exists: false } },
    [
        {
            $set: {
                processed: { $ne: ["$trade", null] },
                processedAt: {
                    $cond: [
                        { $ne: ["$trade", null] },
                        "$updatedAt",
                        null,
                    ],
                },
            },
        },
    ]
);

console.log(`Updated ${result.modifiedCount} execution records.`);
await mongoose.disconnect();
