import mongoose from "mongoose";

let connectionPromise = null;

const connectDB = async ({ exitOnFailure = true } = {}) => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    if (!process.env.MONGODB_URL) {
        const error = new Error("MONGODB_URL is not configured.");

        if (exitOnFailure) {
            console.log("MongoDB connection FAILED ", error);
            process.exit(1);
        }

        throw error;
    }

    connectionPromise = mongoose.connect(process.env.MONGODB_URL);

    try {
        await connectionPromise;
        console.log("\nMongoDB connected");
        return mongoose.connection;
    } catch (error) {
        connectionPromise = null;
        console.log("MongoDB connection FAILED ", error);

        if (exitOnFailure) {
            process.exit(1)
        }

        throw error;
    }
}

export default connectDB
