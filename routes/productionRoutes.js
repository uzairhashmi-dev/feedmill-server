import express from "express";
import {
  createProduction,
  updateProduction,
  getAllProductions,
  getProductionById,
  deleteProduction,
  searchProduction,
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
router.put("/update/:id", PUV, HVE, updateProduction);
router.get("/:id",        getProductionById);
router.delete("/delete/:id", deleteProduction);

export default router;