import express from "express";
import {
    createOrder,
    getAllOrders,
    // getSingleOrder,
    updateOrder,
    deleteOrder,
    searchOrders,
    getOrderMonthlyStats,
    getOrderTotalStats,
    getFormulaStockSummary

} from "../controllers/orderController.js";
import {

    createOrderValidator as OV,
    updateOrderValidator as OUV,
    handleValidationErrors as HVE   
} from "../middleware/validation/orderValidate.js";
import { isLogin } from "../middleware/isAuthenticated.js";

const router = express.Router();
router.use(isLogin);

router.post("/create",OV, HVE, createOrder);
router.get("/all",getAllOrders);
router.get("/search",searchOrders);
router.get("/MonthlyStats",getOrderMonthlyStats);
router.get("/getTotalStats",getOrderTotalStats);
router.get("/getFormulaStockSummary",getFormulaStockSummary);
// router.get("/:id",getSingleOrder);
router.put("/update/:id",OUV, HVE, updateOrder);
router.delete("/delete/:id",deleteOrder);


export default router;