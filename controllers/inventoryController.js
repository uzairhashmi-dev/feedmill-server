import inventoryModel from "../models/inventoryModel.js";
import mongoose from "mongoose";

// ─── Create Inventory Item ────────────────────────────────────────────────────
export const createInventoryItem = async (req, res) => {
  try {
    const { itemName, vendorName, price, quantity, status } = req.body;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can create inventory items",
        success: false,
        data: null,
      });
    }

    const alreadyExists = await inventoryModel.findOne({
      itemName: { $regex: new RegExp(`^${itemName}$`, "i") },
    });

    if (alreadyExists) {
      return res.status(400).json({
        message: "This inventory item already exists",
        success: false,
        data: null,
      });
    }

    const newItem = await inventoryModel.create({
      itemName,
      vendorName,
      price,
      quantity,
      status,
    });

    res.status(201).json({
      message: "Inventory item created successfully",
      success: true,
      data: newItem,
    });
  } catch (err) {
    console.error("createInventoryItem:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Update Inventory Item ────────────────────────────────────────────────────
// BUG FIX: original code set item.itemName = vendorName (copy-paste error)
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, vendorName, price, quantity, status } = req.body;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Inventory Item ID",
        success: false,
        data: null,
      });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can update inventory items",
        success: false,
        data: null,
      });
    }

    const item = await inventoryModel.findById(id);
    if (!item) {
      return res.status(404).json({
        message: "Inventory item not found",
        success: false,
        data: null,
      });
    }

    // Check for duplicate name (excluding current item)
    if (itemName) {
      const nameExists = await inventoryModel.findOne({
        itemName: { $regex: new RegExp(`^${itemName}$`, "i") },
        _id: { $ne: id },
      });
      if (nameExists) {
        return res.status(400).json({
          message: "Item name already exists",
          success: false,
          data: null,
        });
      }
    }

    // ✅ BUG FIX: was `item.itemName = vendorName` — now correctly uses itemName
    if (itemName)   item.itemName   = itemName;
    if (vendorName) item.vendorName = vendorName;
    if (price !== undefined)    item.price    = price;
    if (quantity !== undefined) item.quantity = quantity;
    if (status)     item.status     = status;

    await item.save();

    res.status(200).json({
      message: "Inventory item updated successfully",
      success: true,
      data: item,
    });
  } catch (err) {
    console.error("updateInventoryItem:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Get All Inventory Items ──────────────────────────────────────────────────
export const getAllInventoryItems = async (req, res) => {
  try {
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const items = await inventoryModel.find().sort({ createdAt: -1 });

    // ✅ Return empty array instead of 404 so frontend doesn't crash
    res.status(200).json({
      message: "Inventory items fetched successfully",
      success: true,
      data: items,
    });
  } catch (err) {
    console.error("getAllInventoryItems:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Get Single Inventory Item ────────────────────────────────────────────────
export const getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Inventory Item ID",
        success: false,
        data: null,
      });
    }

    const item = await inventoryModel.findById(id);
    if (!item) {
      return res.status(404).json({
        message: "Inventory item not found",
        success: false,
        data: null,
      });
    }

    res.status(200).json({
      message: "Inventory item fetched successfully",
      success: true,
      data: item,
    });
  } catch (err) {
    console.error("getInventoryItemById:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Delete Inventory Item ────────────────────────────────────────────────────
// BUG FIX: frontend was calling delete/:${id} with a colon prefix — route is now correct
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Inventory Item ID",
        success: false,
        data: null,
      });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can delete inventory items",
        success: false,
        data: null,
      });
    }

    const deletedItem = await inventoryModel.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({
        message: "Inventory item not found",
        success: false,
        data: null,
      });
    }

    res.status(200).json({
      message: "Inventory item deleted successfully",
      success: true,
      data: deletedItem,
    });
  } catch (err) {
    console.error("deleteInventoryItem:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Search Inventory Items ───────────────────────────────────────────────────
export const searchInventoryItems = async (req, res) => {
  try {
    const userId = req.id;
    const searchTerm = req.query.search;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!searchTerm) {
      return res.status(400).json({ success: false, message: "Search term is required" });
    }

    const results = await inventoryModel.find({
      $or: [
        { itemName:   { $regex: searchTerm, $options: "i" } },
        { vendorName: { $regex: searchTerm, $options: "i" } },
        { status:     { $regex: searchTerm, $options: "i" } },
      ],
    });

    if (!results.length) {
      return res.status(404).json({ success: false, message: "No inventory items found" });
    }

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("searchInventoryItems:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ─── Filtered Orders ──────────────────────────────────────────────────────────
export const getFilteredOrders = async (req, res) => {
  try {
    const { search, status, startDate, endDate, minPrice, maxPrice } = req.query;
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    let query = {};

    if (search) {
      query.$or = [
        { itemName:   { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = { $regex: new RegExp(`^${status}$`, "i") };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const orders = await inventoryModel.find(query).sort({ createdAt: -1 });

    if (!orders.length) {
      return res.status(404).json({ success: false, message: "No orders found" });
    }

    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    console.error("getFilteredOrders:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ─── Monthly Stats ────────────────────────────────────────────────────────────
export const getMonthlyStats = async (req, res) => {
  try {
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await inventoryModel.aggregate([
      {
        $facet: {
          totalOrders: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $count: "count" },
          ],
          receivedOrders: [
            { $match: { status: "Received", createdAt: { $gte: startOfMonth } } },
            { $count: "count" },
          ],
          pendingOrders: [
            { $match: { status: "Pending" } },
            { $count: "count" },
          ],
          placedOrders: [
            { $match: { status: "Placed" } },
            { $count: "count" },
          ],
          thisMonthStats: [
            {
              $match: {
                createdAt: { $gte: startOfMonth },
                status: "Received",
              },
            },
            {
              $group: {
                _id: null,
                monthlyTotalPrice:    { $sum: "$price" },
                totalQuantity:        { $sum: "$quantity" },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalOrders: {
            $ifNull: [{ $arrayElemAt: ["$totalOrders.count", 0] }, 0],
          },
          receivedOrders: {
            $ifNull: [{ $arrayElemAt: ["$receivedOrders.count", 0] }, 0],
          },
          pendingOrders: {
            $ifNull: [{ $arrayElemAt: ["$pendingOrders.count", 0] }, 0],
          },
          placedOrders: {
            $ifNull: [{ $arrayElemAt: ["$placedOrders.count", 0] }, 0],
          },
          thisMonthTotalPrice: {
            $ifNull: [{ $arrayElemAt: ["$thisMonthStats.monthlyTotalPrice", 0] }, 0],
          },
          thisMonthTotalQuantity: {
            $ifNull: [{ $arrayElemAt: ["$thisMonthStats.totalQuantity", 0] }, 0],
          },
        },
      },
    ]);

    res.status(200).json({ success: true, monthlyStats: stats[0] });
  } catch (err) {
    console.error("getMonthlyStats:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ─── Total Stats ──────────────────────────────────────────────────────────────
export const getTotalStats = async (req, res) => {
  try {
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const stats = await inventoryModel.aggregate([
      {
        $facet: {
          totalorders: [{ $count: "count" }],
          totalRawMaterial: [
            { $match: { status: "Received" } },
            {
              $group: {
                _id: null,
                totalPrice:    { $sum: "$price" },
                totalQuantity: { $sum: "$quantity" },
              },
            },
          ],
          statusBreakdown: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalOrders: {
            $ifNull: [{ $arrayElemAt: ["$totalorders.count", 0] }, 0],
          },
          totalPrice: {
            $ifNull: [{ $arrayElemAt: ["$totalRawMaterial.totalPrice", 0] }, 0],
          },
          totalQuantity: {
            $ifNull: [{ $arrayElemAt: ["$totalRawMaterial.totalQuantity", 0] }, 0],
          },
          statusBreakdown: "$statusBreakdown",
        },
      },
    ]);

    res.status(200).json({ success: true, totalStats: stats[0] });
  } catch (err) {
    console.error("getTotalStats:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};