// routes/statsRoute.js

import express from "express";
import { prisma } from "../config/db.js";

const router = express.Router();

/**
 * GET /stats/dashboard
 */
router.get("/dashboard", async (req, res) => {
  try {
    const [
      laundryActive,
      laundryReady,
      laundryClaimed,
      laundryEarnings,
      waterActive,
      waterReady,
      waterClaimed,
      waterEarnings,
    ] = await Promise.all([

      // Laundry active = PENDING + WASHING
      prisma.order.count({
        where: { status: { in: ["PENDING", "WASHING"] } },
      }),

      // Laundry ready
      prisma.order.count({
        where: { status: "READY" },
      }),

      // Laundry claimed
      prisma.order.count({
        where: { status: "CLAIMED" },
      }),

      // Laundry earnings from claimed orders
      prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { status: "CLAIMED" },
      }),

      // Water active = PENDING only (no WASHING step for water)
      prisma.waterOrder.count({
        where: { status: "PENDING" },
      }),

      // Water ready
      prisma.waterOrder.count({
        where: { status: "READY" },
      }),

      // Water claimed
      prisma.waterOrder.count({
        where: { status: "CLAIMED" },
      }),

      // Water earnings from claimed orders
      prisma.waterOrder.aggregate({
        _sum: { totalPrice: true },
        where: { status: "CLAIMED" },
      }),
    ]);

    const laundryTotal = laundryEarnings._sum.totalPrice ?? 0;
    const waterTotal   = waterEarnings._sum.totalPrice   ?? 0;

    const payload = {
      laundry: {
        activeOperations: laundryActive,
        readyToReceive:   laundryReady,
        claimedCount:     laundryClaimed,
        totalEarnings:    laundryTotal,
      },
      water: {
        activeOperations: waterActive,
        readyToReceive:   waterReady,
        claimedCount:     waterClaimed,
        totalEarnings:    waterTotal,
      },
      combined: {
        totalEarnings: laundryTotal + waterTotal,
        totalOrders:   laundryClaimed + waterClaimed,
      },
    };

    console.log("[stats] dashboard payload:", JSON.stringify(payload, null, 2));

    return res.status(200).json(payload);

  } catch (error) {
    console.error("[stats] Error fetching dashboard stats:", error);
    return res.status(500).json({
      error: "Internal server error.",
      detail: error.message,
    });
  }
});

export default router;