import "dotenv/config";
import app from "../src/app.js";
import connectDB from "../src/db/connectDB.js";

let dbReady = null;

export default async function handler(req, res) {
    if (!dbReady) {
        dbReady = connectDB({ exitOnFailure: false });
    }

    await dbReady;
    return app(req, res);
}
