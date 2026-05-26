import { prisma } from "../config/db.js";

const PRICE_PER_LOAD = {
  wash: 100,
  wash_dry_fold: 200,
};

const KG_PER_LOAD = 8;

const ORDER_STATUSES = ["pending", "washing", "ready", "claimed"];

const createOrder = async (req, res) => {
  const { customerName, email, contactNumber, weight, serviceType, weightType } = req.body;

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

const parsedWeightType = weightType === true || weightType === "true";

const loads = Math.ceil(weight / KG_PER_LOAD);
const pricePerLoad = PRICE_PER_LOAD[normalizedService];

// base price
let totalPrice = loads * pricePerLoad;

// add ₱30 if weightType is checked/true
if (weightType) {
  totalPrice += 30;
}

  try {
    const order = await prisma.order.create({
      data: {
        customerName,
        email,
        contactNumber: contactNumber ?? null,
        weight,
        serviceType: normalizedService,
        weightType: parsedWeightType,
        totalPrice,
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

  // --- Validation ---
  if (!status) {
    return res.status(400).json({ error: "status is required." });
  }

  const normalizedStatus = status.toLowerCase();
  if (!ORDER_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}.`,
    });
  }

  try {
    // Check if order exists
    const existingOrder = await prisma.order.findUnique({ where: { id } });
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Enforce forward-only progression
    const currentIndex = ORDER_STATUSES.indexOf(existingOrder.status);
    const nextIndex = ORDER_STATUSES.indexOf(normalizedStatus);

    if (nextIndex !== currentIndex + 1) {
      return res.status(400).json({
        error: `Invalid status transition. Order is currently '${existingOrder.status}'. Expected next status: '${ORDER_STATUSES[currentIndex + 1] ?? "none (already claimed)"}'.`,
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: normalizedStatus },
    });

    return res.status(200).json({
      message: `Order status updated to '${normalizedStatus}'.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export { createOrder, updateOrderStatus };