import express from "express";
import { setupAdmin, adminLogin } from "../controller/adminloginController.js";

const router = express.Router();

router.post("/setup", setupAdmin);
router.post("/login", adminLogin);  // ← was router.get

export default router;