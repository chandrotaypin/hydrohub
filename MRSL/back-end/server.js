import 'dotenv/config';
import express from "express";
import { config } from 'dotenv';
import { connectDB, disconnectDB } from "./config/db.js";
import cors from "cors";

// routes
import orderRoute from "./routes/orderRoute.js";
import adminloginRoute from "./routes/adminloginRoute.js";
import waterOrderRoute from "./routes/waterOrderRoute.js";
import transactionRoute from "./routes/transactionRoute.js";
import statsRoute from "./routes/statsRoute.js";

config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: 'https://hydrohub-nine.vercel.app'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/stats", statsRoute);
app.use("/washOrder", orderRoute);
app.use("/admin", adminloginRoute);
app.use("/waterOrder", waterOrderRoute);
app.use("/transaction", transactionRoute);

// Store server instance
const server = app.listen(PORT, () => {
    console.log('Server Running on port', PORT);
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