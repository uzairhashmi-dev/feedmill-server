import express from "express";
import {
  createInventoryItem,
  updateInventoryItem,
  getAllInventoryItems,
  deleteInventoryItem,
  getInventoryItemById,
  searchInventoryItems,
  getFilteredOrders,
  getMonthlyStats,
  getTotalStats,
} from "../controllers/inventoryController.js";
import {
  inventoryValidator as IV,
  updateInventoryValidator as UIV,
  handleValidationErrors as HVE,
} from "../middleware/validation/inventoryValidator.js";
import { isLogin } from "../middleware/isAuthenticated.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(isLogin);

// ── Read routes ───────────────────────────────────────────────────────────────
router.get("/search",        searchInventoryItems);
router.get("/filtered",      getFilteredOrders);
router.get("/MonthlyStats",  getMonthlyStats);
router.get("/getTotalStats", getTotalStats);
router.get("/get",           getAllInventoryItems);
router.get("/singleItem/:id", getInventoryItemById);

// ── Write routes ──────────────────────────────────────────────────────────────
router.post("/create",      IV,  HVE, createInventoryItem);
router.put("/update/:id",   UIV, HVE, updateInventoryItem);
router.delete("/delete/:id",           deleteInventoryItem);

export default router;