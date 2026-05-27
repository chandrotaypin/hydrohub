import express from "express";
import {
  createOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  deleteOrder,
  getActiveOrders,
  getClaimedOrders,
} from "../controller/orderController.js";

const router = express.Router();

router.get("/", getActiveOrders);
router.get("/claimed", getClaimedOrders);
router.post("/createOrder", createOrder);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/payment-status", updateOrderPaymentStatus);
router.delete("/:id", deleteOrder);

export default router;
