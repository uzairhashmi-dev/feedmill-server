import express from "express";
import {
  createProduction,
  updateProduction,
  getAllProductions,
  getProductionById,
  deleteProduction,
  searchProduction,
  getProductionMonthlyStats,
  getProductionTotalStats,
} from "../controllers/productionController.js";
import { isLogin } from "../middleware/isAuthenticated.js";
import {
  productionValidator as PV,
  productionUpdateValidator as PUV,
  handleValidationErrors as HVE,
} from "../middleware/validation/productionValidate.js";

const router = express.Router();
router.use(isLogin);

// Specific routes BEFORE param routes

router.get("/search",     searchProduction);
router.get("/all",        getAllProductions);
router.post("/create",    PV,  HVE, createProduction);
router.get("/MonthlyStats",getProductionTotalStats);
router.get("/getTotalStats", getProductionTotalStats);
router.get("/:id",        getProductionById);
router.put("/update/:id", PUV, HVE, updateProduction);
// router.delete("/delete/:id", deleteProduction);

export default router;



