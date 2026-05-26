import 'dotenv/config';
import express from "express";
import { config } from 'dotenv';
import { connectDB, disconnectDB } from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// routes
import orderRoute from "./routes/orderRoute.js";
import adminloginRoute from "./routes/adminloginRoute.js";
import waterOrderRoute from "./routes/waterOrderRoute.js";
import transactionRoute from "./routes/transactionRoute.js";
import statsRoute from "./routes/statsRoute.js";

config();
connectDB();

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes — must come BEFORE express.static so /stats/dashboard
// is handled as an API call, not a file lookup
app.use("/stats", statsRoute);
app.use("/washOrder", orderRoute);
app.use("/admin", adminloginRoute);
app.use("/waterOrder", waterOrderRoute);
app.use("/transaction", transactionRoute);

// Static files — serve front-end AFTER routes
app.use(express.static(path.join(__dirname, "../front-end")));

// Store server instance
const server = app.listen(PORT, () => {
    console.log(process.env.DATABASE_URL);
    console.log('Server Running');
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (err) => {
    console.error("Unhandled Rejection:", err);
    server.close(async () => {
        await disconnectDB();
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on("uncaughtException", async (err) => {
    console.error("Uncaught Exception:", err);
    await disconnectDB();
    process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(async () => {
        await disconnectDB();
        process.exit(0);
    });
});