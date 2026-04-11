import express from "express";
import { login,registerUser,refreshAccessToken,logout } from "../controllers/authController.js";
import {userValidator as UV ,userLoginValidator as ULV,handleValidationErrors as HVE} from "../middleware/validation/userValidate.js";
import alreadyLogin from "../middleware/alreadyLogin.js";
const router=express.Router();

router.post("/registerUser",UV,HVE,registerUser)
router.post("/login", ULV,HVE,login)
router.post("/refreshAccessToken",refreshAccessToken)
router.get("/logout",logout)

export default router;

