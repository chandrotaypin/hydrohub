import { prisma } from "../config/db.js";
import { sendReadyNotification } from "../utils/mailer.js";

const PRICE_PER_LOAD = {
  wash: 100,
  wash_dry_fold: 200,
};

const KG_PER_LOAD = 8;

const ORDER_STATUSES = ["PENDING", "WASHING", "READY", "CLAIMED"];
const PAYMENT_STATUSES = ["PAID", "UNPAID"];

const normalizePaymentStatus = (paymentStatus) => {
  if (paymentStatus === undefined || paymentStatus === null || paymentStatus === "") {
    return "UNPAID";
  }

  return String(paymentStatus).toUpperCase();
};

const createOrder = async (req, res) => {
  const {
    customerName,
    email,
    contactNumber,
    weight,
    serviceType,
    weightType,
    paymentStatus,
  } = req.body;

  if (!customerName || !email || !weight || !serviceType) {
    return res.status(400).json({ error: "customerName, email, weight, and serviceType are required." });
  }

  const normalizedService = serviceType.toLowerCase().replace(/\s+/g, "_");
  if (!["wash", "wash_dry_fold"].includes(normalizedService)) {
    return res.status(400).json({ error: "serviceType must be either 'wash' or 'wash_dry_fold'." });
  }

  if (typeof weight !== "number" || weight <= 0) {
    return res.status(400).json({ error: "weight must be a positive number." });
  }

  const normalizedPaymentStatus = normalizePaymentStatus(paymentStatus);
  if (!PAYMENT_STATUSES.includes(normalizedPaymentStatus)) {
    return res.status(400).json({
      error: `Invalid paymentStatus. Must be one of: ${PAYMENT_STATUSES.join(", ")}.`,
    });
  }

  const loads = Math.ceil(weight / KG_PER_LOAD);
  const pricePerLoad = PRICE_PER_LOAD[normalizedService];
  const totalPrice = loads * pricePerLoad;

  try {
    const order = await prisma.order.create({
      data: {
        customerName,
        email,
        contactNumber: contactNumber ?? null,
        weight,
        serviceType: normalizedService,
        weightType: weightType ?? false,
        totalPrice,
        paymentStatus: normalizedPaymentStatus,
      },
    });

    return res.status(201).json({
      message: "Order created successfully.",
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const updateOrderStatus = async (req, res) => {
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
  if (!ORDER_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}.`,
    });
  }

  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found." });
    }

    const currentIndex = ORDER_STATUSES.indexOf(existingOrder.status);
    const nextIndex = ORDER_STATUSES.indexOf(normalizedStatus);

    if (nextIndex !== currentIndex + 1) {
      return res.status(400).json({
        error: `Invalid status transition. Order is currently '${existingOrder.status}'. Expected next status: '${ORDER_STATUSES[currentIndex + 1] ?? "none (already claimed)"}'.`,
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: normalizedStatus },
    });

    // Send email when status becomes READY — fire-and-forget so it never
    // blocks the HTTP response even if SMTP is slow or unavailable.
    if (normalizedStatus === "READY" && updatedOrder.email) {
      sendReadyNotification({
        to: updatedOrder.email,
        customerName: updatedOrder.customerName,
        orderType: "Laundry",
        orderId: updatedOrder.id,
        totalPrice: updatedOrder.totalPrice,
      }).catch((mailError) =>
        console.error("Failed to send ready notification email:", mailError)
      );
    }

    return res.status(200).json({
      message: `Order status updated to '${normalizedStatus}'.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const getActiveOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["PENDING", "WASHING", "READY"] },
      },
      include: {
        transaction: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching active orders:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const getClaimedOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "CLAIMED",
      },
      include: {
        transaction: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching claimed orders:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const deleteOrder = async (req, res) => {
  const { id } = req.params;

  const orderId = parseInt(id);
  if (isNaN(orderId)) {
    return res.status(400).json({ error: "Invalid order ID." });
  }

  try {
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found." });
    }

    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { orderId } }),
      prisma.order.delete({ where: { id: orderId } }),
    ]);

    return res.status(200).json({ message: "Order deleted successfully." });
  } catch (error) {
    console.error("Error deleting order:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const updateOrderPaymentStatus = async (req, res) => {
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
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found." });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: normalizedPaymentStatus },
    });

    return res.status(200).json({
      message: `Order payment status updated to '${normalizedPaymentStatus}'.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order payment status:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export {
  createOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
  deleteOrder,
  getActiveOrders,
  getClaimedOrders,
};