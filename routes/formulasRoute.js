import express from "express";
import {
  createFormula,
  updateFormula,
  getAllFormulas,
  getFormulaById,
  deleteFormula,
  search,
} from "../controllers/formulasController.js";
import { isLogin } from "../middleware/isAuthenticated.js";
import {
  formulaValidator as FV,
  formulaUpdateValidator as FUV,
  handleValidationErrors as HVE,
} from "../middleware/validation/formulaValidate.js";

const router = express.Router();
router.use(isLogin);

// Specific routes BEFORE param routes to avoid /:id swallowing them
router.get("/search",     search);
router.get("/all",        getAllFormulas);
router.post("/create",    FV,  HVE, createFormula);
router.put("/update/:id", FUV, HVE, updateFormula);
router.get("/:id",        getFormulaById);
router.delete("/delete/:id", deleteFormula);

export default router;