import express from "express";
import {
  getWaterOrders,
  createWaterOrder,
  updateWaterOrderStatus,
  updateWaterOrderPaymentStatus,
  deleteWaterOrder,
} from "../controller/waterOrderController.js";

const router = express.Router();

router.get("/", getWaterOrders);
router.post("/createWaterOrder", createWaterOrder);
router.patch("/:id/status", updateWaterOrderStatus);
router.patch("/:id/payment-status", updateWaterOrderPaymentStatus);
router.delete("/:id", deleteWaterOrder);

export default router;
