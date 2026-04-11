import express from "express";
import {
  createStaff,
  updateStaff,
  getAllStaff,
  getStaffById,
  deleteStaff,
}
 from "../controllers/staffController.js";
import { isLogin } from "../middleware/isLogin.js";
import { staffValidator } from "../validators/staffValidator.js";

const router = express.Router();
router.use(isLogin);

router.post("/create",staffValidator, createStaff);
router.put("/update/:id",staffValidator, updateStaff);
router.get("/all",getAllStaff);
router.get("/:id",getStaffById);
router.delete("/delete/:id",deleteStaff);

export default router;




