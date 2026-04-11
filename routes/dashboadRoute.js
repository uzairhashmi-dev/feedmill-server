import express from "express";
import { homepage } from "../controllers/dashboardController.js";
import isLogin from "../middleware/isAuthenticated.js";
const router=express.Router();

router.get("/home",isLogin,homepage)

export default router

