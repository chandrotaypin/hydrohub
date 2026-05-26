import express from "express";
import {
  createOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  getActiveOrders,
  getClaimedOrders,
} from "../controller/orderController.js";

const router = express.Router();

router.get("/", getActiveOrders);
router.get("/claimed", getClaimedOrders);
router.post("/createOrder", createOrder);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/payment-status", updateOrderPaymentStatus);

export default router;
