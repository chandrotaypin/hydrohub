import { prisma } from "../config/db.js";

const PAYMENT_METHODS = ["CASH", "GCASH"];
const ORDER_TYPES = ["LAUNDRY", "WATER"];

const createTransaction = async (req, res) => {
  const { orderId, customerID, paymentMethod, orderType } = req.body;

  //  Validate required fields ---
  if (!orderId || !customerID || !paymentMethod || !orderType) {
    return res.status(400).json({
      error: "orderId, customerID, paymentMethod, and orderType are required.",
    });
  }

  const parsedOrderId = parseInt(orderId);
  if (isNaN(parsedOrderId)) {
    return res.status(400).json({ error: "orderId must be a valid integer." });
  }

  const normalizedPaymentMethod = paymentMethod.toUpperCase();
  if (!PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
    return res.status(400).json({
      error: `Invalid paymentMethod. Must be one of: ${PAYMENT_METHODS.join(", ")}.`,
    });
  }

  const normalizedOrderType = orderType.toUpperCase();
  if (!ORDER_TYPES.includes(normalizedOrderType)) {
    return res.status(400).json({
      error: `Invalid orderType. Must be one of: ${ORDER_TYPES.join(", ")}.`,
    });
  }

  try {
    let order = null;

    // --- Look up the correct table based on orderType ---
    if (normalizedOrderType === "LAUNDRY") {
      order = await prisma.order.findUnique({ where: { id: parsedOrderId } });
    } else if (normalizedOrderType === "WATER") {
      order = await prisma.waterOrder.findUnique({ where: { id: parsedOrderId } });
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // --- Guard: only allow transaction if order is CLAIMED ---
    if (order.status !== "CLAIMED") {
      return res.status(400).json({
        error: `Transaction can only be created for orders with status 'CLAIMED'. Current status: '${order.status}'.`,
      });
    }

    // --- Guard: prevent duplicate transactions ---
    const duplicateCheck =
      normalizedOrderType === "LAUNDRY"
        ? { orderId: parsedOrderId }
        : { waterOrderId: parsedOrderId };

    const existingTransaction = await prisma.transaction.findUnique({
      where: duplicateCheck,
    });

    if (existingTransaction) {
      return res.status(409).json({
        error: "A transaction already exists for this order.",
      });
    }

    // --- Create the transaction record ---
    const transactionData = {
      amount: order.totalPrice,
      customerID,
      paymentMethod: normalizedPaymentMethod,
      orderType: normalizedOrderType,
      ...(normalizedOrderType === "LAUNDRY"
        ? { orderId: parsedOrderId }
        : { waterOrderId: parsedOrderId }),
    };

    const transaction = await prisma.transaction.create({
      data: transactionData,
      include: {
        order: normalizedOrderType === "LAUNDRY",
        waterOrder: normalizedOrderType === "WATER",
      },
    });

    if (normalizedOrderType === "LAUNDRY") {
      await prisma.order.update({
        where: { id: parsedOrderId },
        data: { paymentStatus: "PAID" },
      });
    }

    if (normalizedOrderType === "WATER") {
      await prisma.waterOrder.update({
        where: { id: parsedOrderId },
        data: { paymentStatus: "PAID" },
      });
    }

    return res.status(201).json({
      message: "Transaction created successfully.",
      transaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { order: true, waterOrder: true },
      orderBy: { claimedAt: "desc" },
    });

    return res.status(200).json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const getTransactionById = async (req, res) => {
  const { id } = req.params;

  const transactionId = parseInt(id);
  if (isNaN(transactionId)) {
    return res.status(400).json({ error: "Invalid transaction ID." });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { order: true, waterOrder: true },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    return res.status(200).json({ transaction });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export { createTransaction, getAllTransactions, getTransactionById };
