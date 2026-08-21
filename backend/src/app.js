import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.js";

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:3000"];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (Postman/cURL) OR matching allowed origins
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        credentials: true,
    })
);

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Intraday Journal API is running"
    });
});

import authRouter from "./routes/auth.routes.js"
app.use("/api/v1/auth", authRouter)

import importRouter from "./routes/import.routes.js"
app.use("/api/v1/imports", importRouter);

import accountRouter from "./routes/account.routes.js"
app.use("/api/v1/account", accountRouter);

import tradeRouter from "./routes/trade.routes.js"
app.use("/api/v1/trades", tradeRouter);

import analyticsRouter from "./routes/analytics.routes.js"
app.use("/api/v1/analytics", analyticsRouter);

import upstoxRouter from "./routes/upstox.routes.js";
app.use("/api/v1/upstox", upstoxRouter);

app.use(errorHandler);

export default app;