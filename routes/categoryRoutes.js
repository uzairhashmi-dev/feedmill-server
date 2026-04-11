import express from "express";
import {
  createCategory,
  updateCategory,
  getAllCategories,
  getCategoryById,
  deleteCategory,
  search,
} from "../controllers/categoryController.js";
import { isLogin } from "../middleware/isAuthenticated.js";
import {
  categoryValidator as CV,
  handleValidationErrors as HVE,
  categoryUpdateValidator as CUV,
} from "../middleware/validation/categoryValidate.js";

const router = express.Router();
router.use(isLogin);

router.get("/search",         search);
router.get("/all",            getAllCategories);
router.get("/singleItem/:id", getCategoryById);
router.post("/create",        CV,  HVE, createCategory);
router.put("/update/:id",     CUV, HVE, updateCategory);
router.delete("/delete/:id",       deleteCategory);

export default router;