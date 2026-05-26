import { Router } from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
} from "../controller/transactionController.js";

const router = Router();

// POST /api/transactions       — create a transaction (order must be CLAIMED)
router.post("/", createTransaction);

// GET  /api/transactions       — fetch all transactions
router.get("/", getAllTransactions);

// GET  /api/transactions/:id   — fetch a single transaction by ID
router.get("/:id", getTransactionById);

export default router;