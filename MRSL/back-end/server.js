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
import statsRoute from "./routes/statsroute.js";

config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

const corsOptions = {
  origin: 'https://hydrohub-nine.vercel.app',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

// Handle preflight OPTIONS requests for all routes
app.options('/{*path}', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Email test route (remove after confirming email works) ──────────────────
import { sendReadyNotification } from "./utils/mailer.js";
app.get("/test-email", async (req, res) => {
  const to = req.query.to;
  if (!to) return res.status(400).json({ error: "Pass ?to=youremail@gmail.com" });
  try {
    await sendReadyNotification({
      to,
      customerName: "Test Customer",
      orderType: "Laundry",
      orderId: 9999,
      totalPrice: 200,
    });
    return res.json({ success: true, message: `Email sent to ${to}` });
  } catch (err) {
    console.error("Test email failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

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