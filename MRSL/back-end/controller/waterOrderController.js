import { prisma } from "../config/db.js";
import { sendReadyNotification } from "../utils/mailer.js";

const WATER_PRICES = {
  new_container: 130,
  refill: 25,
};

const WATER_ORDER_STATUSES = ["PENDING", "READY", "CLAIMED"];
const PAYMENT_STATUSES = ["PAID", "UNPAID"];

const normalizePaymentStatus = (paymentStatus) => {
  if (paymentStatus === undefined || paymentStatus === null || paymentStatus === "") {
    return "UNPAID";
  }

  return String(paymentStatus).toUpperCase();
};

// ─── GET all water orders ─────────────────────────────────────────────────────
const getWaterOrders = async (req, res) => {
  try {
    const waterOrders = await prisma.waterOrder.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ waterOrders });
  } catch (error) {
    console.error("Error fetching water orders:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ─── POST create water order ──────────────────────────────────────────────────
const createWaterOrder = async (req, res) => {
  const { customerName, email, serviceType, quantity, paymentStatus } = req.body;

  if (!customerName || !serviceType || quantity === undefined) {
    return res.status(400).json({
      error: "customerName, serviceType, and quantity are required.",
    });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  const normalizedService = serviceType.toLowerCase().replace(/\s+/g, "_");
  if (!["new_container", "refill"].includes(normalizedService)) {
    return res.status(400).json({
      error: "serviceType must be either 'new_container' or 'refill'.",
    });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      error: "quantity must be a positive whole number.",
    });
  }

  const normalizedPaymentStatus = normalizePaymentStatus(paymentStatus);
  if (!PAYMENT_STATUSES.includes(normalizedPaymentStatus)) {
    return res.status(400).json({
      error: `Invalid paymentStatus. Must be one of: ${PAYMENT_STATUSES.join(", ")}.`,
    });
  }

  const totalPrice = WATER_PRICES[normalizedService] * quantity;

  try {
    const waterOrder = await prisma.waterOrder.create({
      data: {
        customerName,
        email: email ?? null,
        serviceType: normalizedService === "new_container"
          ? "NEW_CONTAINER"
          : "REFILL",
        quantity,
        totalPrice,
        paymentStatus: normalizedPaymentStatus,
      },
    });

    return res.status(201).json({
      message: "Water order created successfully.",
      waterOrder,
    });
  } catch (error) {
    console.error("Water order error:", JSON.stringify(error, null, 2));
    return res.status(500).json({
      name: error.name,
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
  }
};

// ─── PATCH update water order status ─────────────────────────────────────────
const updateWaterOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const orderId = parseInt(id);
  if (isNaN(orderId)) {
    return res.status(400).json({ error: "Invalid order ID." });
  }

  if (!status) {
    return res.status(400).json({ error: "status is required." });
  }

  const normalizedStatus = status.toUpperCase();
  if (!WATER_ORDER_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${WATER_ORDER_STATUSES.join(", ")}.`,
    });
  }

  try {
    const existingOrder = await prisma.waterOrder.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      return res.status(404).json({ error: "Water order not found." });
    }

    const currentIndex = WATER_ORDER_STATUSES.indexOf(existingOrder.status);
    const nextIndex = WATER_ORDER_STATUSES.indexOf(normalizedStatus);

    if (nextIndex !== currentIndex + 1) {
      return res.status(400).json({
        error: `Invalid status transition. Order is currently '${existingOrder.status}'. Expected next status: '${WATER_ORDER_STATUSES[currentIndex + 1] ?? "none (already claimed)"}'.`,
      });
    }

    const updatedOrder = await prisma.waterOrder.update({
      where: { id: orderId },
      data: { status: normalizedStatus },
    });

    if (normalizedStatus === "READY" && updatedOrder.email) {
      try {
        await sendReadyNotification({
          to: updatedOrder.email,
          customerName: updatedOrder.customerName,
          orderType: "Water Refilling",
          orderId: updatedOrder.id,
          totalPrice: updatedOrder.totalPrice,
        });
      } catch (mailError) {
        console.error("Failed to send ready notification email:", mailError);
      }
    }

    return res.status(200).json({
      message: `Water order status updated to '${normalizedStatus}'.`,
      waterOrder: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating water order status:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const updateWaterOrderPaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  const orderId = parseInt(id);
  if (isNaN(orderId)) {
    return res.status(400).json({ error: "Invalid order ID." });
  }

  const normalizedPaymentStatus = normalizePaymentStatus(paymentStatus);
  if (!PAYMENT_STATUSES.includes(normalizedPaymentStatus)) {
    return res.status(400).json({
      error: `Invalid paymentStatus. Must be one of: ${PAYMENT_STATUSES.join(", ")}.`,
    });
  }

  try {
    const existingOrder = await prisma.waterOrder.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      return res.status(404).json({ error: "Water order not found." });
    }

    const updatedOrder = await prisma.waterOrder.update({
      where: { id: orderId },
      data: { paymentStatus: normalizedPaymentStatus },
    });

    return res.status(200).json({
      message: `Water order payment status updated to '${normalizedPaymentStatus}'.`,
      waterOrder: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating water order payment status:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export {
  getWaterOrders,
  createWaterOrder,
  updateWaterOrderStatus,
  updateWaterOrderPaymentStatus,
};
