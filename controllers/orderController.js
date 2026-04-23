
import orderModel from "../models/orderModel.js";
import productionModel from "../models/productionModel.js";
import formulaModel from "../models/formulaModel.js";
import mongoose from "mongoose";

const toKG = (quantity, unit) => {
  if (unit === "ton")   return quantity * 1000;
  if (unit === "liter") return quantity * 0.9;
  return quantity;
};

const getFormulaAvailableKG = async (formulaId, excludeOrderId = null) => {
  const productions = await productionModel.find({
    formula: formulaId,
    status:  "Completed",
  });

  const totalProductionKG = productions.reduce((s, p) => s + p.production, 0);

  const matchStage = {
    formula: new mongoose.Types.ObjectId(formulaId),
    status:  { $in: ["Completed", "Pending"] },
  };
  if (excludeOrderId) {
    matchStage._id = { $ne: new mongoose.Types.ObjectId(excludeOrderId) };
  }

  const soldAgg = await orderModel.aggregate([
    { $match: matchStage },
    { $group: { _id: null, soldKG: { $sum: "$quantityKG" } } },
  ]);
  const soldKG = soldAgg[0]?.soldKG || 0;

  return { totalProductionKG, soldKG, availableKG: totalProductionKG - soldKG };
};

const syncProductionAvailable = async (formulaId) => {
  const productions = await productionModel.find({
    formula: formulaId,
    status:  "Completed",
  }).sort({ createdAt: 1 });

  const soldAgg = await orderModel.aggregate([
    {
      $match: {
        formula: new mongoose.Types.ObjectId(formulaId),
        status:  { $in: ["Completed", "Pending"] },
      },
    },
    { $group: { _id: null, soldKG: { $sum: "$quantityKG" } } },
  ]);

  let remainingSold = soldAgg[0]?.soldKG || 0;

  for (const prod of productions) {
    const deduct = Math.min(remainingSold, prod.production);
    await productionModel.findByIdAndUpdate(prod._id, {
      availableKG: prod.production - deduct,
    });
    remainingSold -= deduct;
  }
};

export const createOrder = async (req, res) => {
  try {
    const { customerName, formulaId, quantity, unit, price, paymentPaid, status } = req.body;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({ message: "Forbidden – only admin or manager can create an order", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(formulaId)) {
      return res.status(400).json({ message: "Invalid Formula ID", success: false, data: null });
    }

    const { totalProductionKG, soldKG, availableKG } = await getFormulaAvailableKG(formulaId);

    if (totalProductionKG === 0) {
      return res.status(400).json({ message: "No completed production found for this formula", success: false, data: null });
    }

    const quantityKG = toKG(Number(quantity), unit);

    if (quantityKG > availableKG) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${availableKG}kg, Requested: ${quantityKG}kg`,
        success: false,
        data: null,
      });
    }

    const totalPayment = quantityKG * Number(price);
    const resolvedPaid = Number(paymentPaid || 0);

    if (resolvedPaid > totalPayment) {
      return res.status(400).json({ message: "Payment paid cannot exceed total payment", success: false, data: null });
    }

    const newOrder = await orderModel.create({
      customerName,
      formula:        formulaId,
      quantity:       Number(quantity),
      unit,
      quantityKG,
      price:          Number(price),
      totalPayment,
      paymentPaid:    resolvedPaid,
      paymentPending: totalPayment - resolvedPaid,
      status:         status || "Pending",
      created:        userId,
    });

    await syncProductionAvailable(formulaId);

    return res.status(201).json({
      message: "Order created successfully",
      success: true,
      data: {
        order: newOrder,
        stockSummary: {
          totalProductionKG,
          soldKG:      soldKG + quantityKG,
          availableKG: availableKG - quantityKG,
        },
      },
    });
  } catch (err) {
    console.error("createOrder:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, quantity, unit, price, paymentPaid, status } = req.body;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Order ID", success: false, data: null });
    }
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({ message: "Forbidden – only admin or manager can update an order", success: false, data: null });
    }

    const order = await orderModel.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found", success: false, data: null });
    }

    if (quantity !== undefined || unit) {
      const resolvedQuantity = quantity !== undefined ? Number(quantity) : order.quantity;
      const resolvedUnit     = unit || order.unit;
      const newQuantityKG    = toKG(resolvedQuantity, resolvedUnit);

      const { availableKG } = await getFormulaAvailableKG(order.formula, id);

      if (newQuantityKG > availableKG) {
        return res.status(400).json({
          message: `Insufficient stock. Available: ${availableKG}kg, Requested: ${newQuantityKG}kg`,
          success: false,
          data: null,
        });
      }

      order.quantity   = resolvedQuantity;
      order.unit       = resolvedUnit;
      order.quantityKG = newQuantityKG;
    }

    if (customerName)        order.customerName = customerName;
    if (price !== undefined) order.price        = Number(price);
    if (status)              order.status       = status;

    order.totalPayment = order.quantityKG * order.price;
    const resolvedPaid = paymentPaid !== undefined ? Number(paymentPaid) : order.paymentPaid;

    if (resolvedPaid > order.totalPayment) {
      return res.status(400).json({ message: "Payment paid cannot exceed total payment", success: false, data: null });
    }

    order.paymentPaid    = resolvedPaid;
    order.paymentPending = order.totalPayment - resolvedPaid;

    await order.save();
    await syncProductionAvailable(order.formula);

    return res.status(200).json({ message: "Order updated successfully", success: true, data: order });
  } catch (err) {
    console.error("updateOrder:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Order ID", success: false, data: null });
    }
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Forbidden – only admin can delete an order", success: false, data: null });
    }

    const deleted = await orderModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Order not found", success: false, data: null });
    }

    await syncProductionAvailable(deleted.formula);

    return res.status(200).json({ message: "Order deleted successfully", success: true, data: deleted });
  } catch (err) {
    console.error("deleteOrder:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

export const searchOrders = async (req, res) => {
  try {
    const userId     = req.id;
    const searchTerm = req.query.search;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!searchTerm) {
      return res.status(400).json({ message: "Search term is required", success: false, data: null });
    }

    const results = await orderModel
      .find({ customerName: { $regex: searchTerm, $options: "i" } })
      .populate("formula", "formulaName formulaCode")
      .populate("created", "name email")
      .sort({ createdAt: -1 });

    if (!results.length) {
      return res.status(404).json({ message: "No orders found", success: false, data: null });
    }

    return res.status(200).json({ message: "Orders fetched successfully", success: true, data: results });
  } catch (err) {
    console.error("searchOrders:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

export const getFormulaStockSummary = async (req, res) => {
  try {
    const userId = req.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const productionSummary = await productionModel.aggregate([
      { $match: { status: "Completed" } },
      { $group: { _id: "$formula", totalProductionKG: { $sum: "$production" } } },
    ]);

    const orderSummary = await orderModel.aggregate([
      { $match: { status: { $in: ["Completed", "Pending"] } } },
      { $group: { _id: "$formula", soldKG: { $sum: "$quantityKG" } } },
    ]);

    const soldMap = {};
    for (const o of orderSummary) {
      soldMap[o._id.toString()] = o.soldKG;
    }

    const formulaIds = productionSummary.map((p) => p._id);
    const formulas   = await formulaModel
      .find({ _id: { $in: formulaIds } })
      .select("formulaName formulaCode");

    const formulaMap = {};
    for (const f of formulas) {
      formulaMap[f._id.toString()] = { formulaName: f.formulaName, formulaCode: f.formulaCode };
    }

    const result = productionSummary.map((p) => {
      const fId         = p._id.toString();
      const soldKG      = soldMap[fId] || 0;
      return {
        formulaId:         fId,
        formulaName:       formulaMap[fId]?.formulaName || "Unknown",
        formulaCode:       formulaMap[fId]?.formulaCode || "",
        totalProductionKG: p.totalProductionKG,
        soldKG,
        availableKG:       p.totalProductionKG - soldKG,
      };
    });

    return res.status(200).json({
      message: "Formula stock summary fetched successfully",
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("getFormulaStockSummary:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getOrderMonthlyStats = async (req, res) => {
  try {
    const userId = req.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await orderModel.aggregate([
      {
        $facet: {
          totalOrders:     [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: "count" }],
          completedOrders: [{ $match: { status: "Completed", createdAt: { $gte: startOfMonth } } }, { $count: "count" }],
          pendingOrders:   [{ $match: { status: "Pending"   } }, { $count: "count" }],
          cancelledOrders: [{ $match: { status: "Cancelled" } }, { $count: "count" }],
          thisMonthStats: [
            { $match: { createdAt: { $gte: startOfMonth }, status: { $in: ["Completed", "Pending"] } } },
            {
              $group: {
                _id:                    null,
                monthlyTotalAmount:     { $sum: "$totalPayment" },
                monthlyTotalQuantityKG: { $sum: "$quantityKG" },
                monthlyPaymentPaid:     { $sum: "$paymentPaid" },
                monthlyPaymentPending:  { $sum: "$paymentPending" },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalOrders:              { $ifNull: [{ $arrayElemAt: ["$totalOrders.count",                        0] }, 0] },
          completedOrders:          { $ifNull: [{ $arrayElemAt: ["$completedOrders.count",                    0] }, 0] },
          pendingOrders:            { $ifNull: [{ $arrayElemAt: ["$pendingOrders.count",                      0] }, 0] },
          cancelledOrders:          { $ifNull: [{ $arrayElemAt: ["$cancelledOrders.count",                    0] }, 0] },
          thisMonthTotalAmount:     { $ifNull: [{ $arrayElemAt: ["$thisMonthStats.monthlyTotalAmount",         0] }, 0] },
          thisMonthTotalQuantityKG: { $ifNull: [{ $arrayElemAt: ["$thisMonthStats.monthlyTotalQuantityKG",     0] }, 0] },
          thisMonthPaymentPaid:     { $ifNull: [{ $arrayElemAt: ["$thisMonthStats.monthlyPaymentPaid",         0] }, 0] },
          thisMonthPaymentPending:  { $ifNull: [{ $arrayElemAt: ["$thisMonthStats.monthlyPaymentPending",      0] }, 0] },
        },
      },
    ]);

    return res.status(200).json({ success: true, monthlyStats: stats[0] });
  } catch (err) {
    console.error("getOrderMonthlyStats:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getOrderTotalStats = async (req, res) => {
  try {
    const userId = req.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const stats = await orderModel.aggregate([
      {
        $facet: {
          totalOrders:     [{ $count: "count" }],
          completedOrders: [{ $match: { status: "Completed" } }, { $count: "count" }],
          pendingOrders:   [{ $match: { status: "Pending"   } }, { $count: "count" }],
          cancelledOrders: [{ $match: { status: "Cancelled" } }, { $count: "count" }],
          overallStats: [
            { $match: { status: { $in: ["Completed", "Pending"] } } },
            {
              $group: {
                _id:                 null,
                totalAmount:         { $sum: "$totalPayment" },
                totalQuantityKG:     { $sum: "$quantityKG" },
                totalPaymentPaid:    { $sum: "$paymentPaid" },
                totalPaymentPending: { $sum: "$paymentPending" },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalOrders:         { $ifNull: [{ $arrayElemAt: ["$totalOrders.count",                   0] }, 0] },
          completedOrders:     { $ifNull: [{ $arrayElemAt: ["$completedOrders.count",               0] }, 0] },
          pendingOrders:       { $ifNull: [{ $arrayElemAt: ["$pendingOrders.count",                 0] }, 0] },
          cancelledOrders:     { $ifNull: [{ $arrayElemAt: ["$cancelledOrders.count",               0] }, 0] },
          totalAmount:         { $ifNull: [{ $arrayElemAt: ["$overallStats.totalAmount",            0] }, 0] },
          totalQuantityKG:     { $ifNull: [{ $arrayElemAt: ["$overallStats.totalQuantityKG",        0] }, 0] },
          totalPaymentPaid:    { $ifNull: [{ $arrayElemAt: ["$overallStats.totalPaymentPaid",       0] }, 0] },
          totalPaymentPending: { $ifNull: [{ $arrayElemAt: ["$overallStats.totalPaymentPending",    0] }, 0] },
        },
      },
    ]);

    return res.status(200).json({ success: true, totalStats: stats[0] });
  } catch (err) {
    console.error("getOrderTotalStats:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};