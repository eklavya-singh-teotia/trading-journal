import "dotenv/config";
import connectDB from "./db/connectDB.js";
import app from "./app.js";

const PORT = process.env.PORT
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    })
    .catch((err) => {
        console.log("MONGODB connection FAILED:", err);
    })