import inventoryModel from "../models/inventoryModel.js";
import formulaModel from "../models/formulaModel.js";
import mongoose from "mongoose";

export const createInventoryItem = async (req, res) => {
  try {
    const { itemName, vendorName, price, quantityReceived, unit, status } =
      req.body;
    const userId = req.id;
    const userRole = req.role;
    //  (for fake field)
    const allowedFields = [
      "itemName",
      "vendorName",
      "price",
      "quantityReceived",
      "unit",
      "status",
    ];
    const unknownFields = Object.keys(req.body).filter(
      (f) => !allowedFields.includes(f),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        message: `Invalid field(s): ${unknownFields.join(", ")}`,
        success: false,
        data: null,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
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
    const unitConversionMap = {
      ton: quantityReceived * 1000,
      liter: quantityReceived * 0.9,
      kg: quantityReceived * 1,
    };

    const quantityValue = unitConversionMap[unit] ?? quantityReceived;

    const newItem = await inventoryModel.create({
      itemName,
      vendorName,
      price,
      quantity: quantityValue,
      quantityReceived,
      unit,
      status,
    });

    res.status(201).json({
      message: "Inventory item created successfully",
      success: true,
      data: newItem,
    });
  } catch (err) {
    console.error("createInventoryItem:", err);
    res
      .status(500)
      .json({ message: "Server Error", success: false, data: null });
  }
};
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, vendorName, price, quantityReceived, status, unit } =
      req.body;
    const userId = req.id;
    const userRole = req.role;

    //  (for fake field)
    const allowedFields = [
      "itemName",
      "vendorName",
      "price",
      "quantityReceived",
      "unit",
      "status",
    ];
    const unknownFields = Object.keys(req.body).filter(
      (f) => !allowedFields.includes(f),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        message: `Invalid field(s): ${unknownFields.join(", ")}`,
        success: false,
        data: null,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
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
    if(!item) {
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


    // Agar price change hui hai tu saare related formulas ka costPerMT recalculate karo
if (price) {
  const MT_IN_KG = 1000;

  // Saare wo formulas dhundo jisme yeh item ingredient hai
  const relatedFormulas = await formulaModel.find({
    ingredients: {
      $elemMatch: { key: { $regex: new RegExp(`^${item.itemName}$`, "i") } },
    },
  });

  // Har formula ka costPerMT recalculate karo
  for(const formula of relatedFormulas) {
    let newCost = 0;

    for (const ing of formula.ingredients) {
      // Har ingredient ki latest price inventory se lo
      const invItem = await inventoryModel.findOne({
        itemName: { $regex: new RegExp(`^${ing.key}$`, "i") },
      });
      if (invItem){
        const kgNeeded = (ing.value / 100) * MT_IN_KG;
        // Agar yeh wahi item hai jo update ho rahi hai tu naya price use karo
        newCost += kgNeeded * (ing.key.toLowerCase() === item.itemdName.toLowerCase() ? price : invItem.price);
    }}
    formula.costPerMT = Math.round(newCost);
    await formula.save();
  }
}

    const finalUnit = unit ?? item.unit;
    const finalQtyReceived =
      quantityReceived !== undefined ? quantityReceived : item.quantityReceived;

    const unitConversionMap = {
      ton: finalQtyReceived * 1000,
      liter: finalQtyReceived * 0.9,
      kg: finalQtyReceived * 1,
    };
    const quantityValue = unitConversionMap[finalUnit] ?? finalQtyReceived;

    if (itemName) item.itemName = itemName;
    if (vendorName) item.vendorName = vendorName;
    if (price !== undefined) item.price = price;
    if (quantityReceived !== undefined)
      item.quantityReceived = quantityReceived;
    if (status) item.status = status;
    if (unit) item.unit = unit;

    item.quantity = quantityValue;

    await item.save();
    res.status(200).json({
      message: "Inventory item updated successfully",
      success: true,
      data: item,
    });
  } catch (err) {
    console.error("updateInventoryItem:", err);
    res
      .status(500)
      .json({ message: "Server Error", success: false, data: null });
  }
};
export const getAllInventoryItems = async (req, res) => {
  try {
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
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
    res
      .status(500)
      .json({ message: "Server Error", success: false, data: null });
  }
};
export const getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
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
    res
      .status(500)
      .json({ message: "Server Error", success: false, data: null });
  }
};
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
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


const item = await inventoryModel.findById(id);
if (!item) {
return res.status(404).json(
    { 
      message: "Inventory item not found",
      success: false,
      data: null
    });
}

const usedInFormula = await formulaModel.findOne({
  ingredients:{
  $elemMatch:{ key: { $regex: new RegExp(`^${item.itemName}$`, "i") } },
  },
});

if (usedInFormula) {
  return res.status(400).json({
    message: `This inventory item cannot be deleted because it is used in formula: "${usedInFormula.formulaName}"`,
    success: false,
    data: null,
  });
}

await item.deleteOne();

res.status(200).json(
{ message: "Inventory item deleted successfully",
   success: true,
    data: item
});

} 
  catch (err) {
    console.error("deleteInventoryItem:", err);
    res
      .status(500)
      .json({ message: "Server Error", success: false, data: null });
  }
};
export const searchInventoryItems = async (req, res) => {
  try {
    const userId = req.id;
    const searchTerm = req.query.search;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!searchTerm) {
      return res
        .status(400)
        .json({ success: false, message: "Search term is required" });
    }

    const results = await inventoryModel.find({
      $or: [
        { itemName: { $regex: searchTerm, $options: "i" } },
        { vendorName: { $regex: searchTerm, $options: "i" } },
        { status: { $regex: searchTerm, $options: "i" } },
      ],
    });

    if (!results.length) {
      return res
        .status(404)
        .json({ success: false, message: "No inventory items found" });
    }

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("searchInventoryItems:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getFilteredOrders = async (req, res) => {
  try {
    const { search, status, startDate, endDate, minPrice, maxPrice } =
      req.query;
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
    }

    let query = {};

    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = { $regex: new RegExp(`^${status}$`, "i") };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)
        query.createdAt.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999),
        );
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const orders = await inventoryModel.find(query).sort({ createdAt: -1 });

    if (!orders.length) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found" });
    }

    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    console.error("getFilteredOrders:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getMonthlyStats = async (req, res) => {
  try {
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
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
            {
              $match: { status: "Received", createdAt: { $gte: startOfMonth } },
            },
            { $count: "count" },
          ],
          pendingOrders: [
            { $match: { status: "Pending" } },
            { $count: "count" },
          ],
          placedOrders: [{ $match: { status: "Placed" } }, { $count: "count" }],
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
                monthlyTotalPrice: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$unit", "liter"] },
                      then: { $multiply: ["$price", "$quantityReceived"] },
                      else: { $multiply: ["$price", "$quantity"] },
                    },
                  },
                },
                totalQuantity: { $sum: "$quantity" },
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
            $ifNull: [
              { $arrayElemAt: ["$thisMonthStats.monthlyTotalPrice", 0] },
              0,
            ],
          },
            thisMonthTotalQuantity: {
            $ifNull: [
              { $arrayElemAt: ["$thisMonthStats.totalQuantity", 0] },
              0,
            ],
          },
        },
      },
    ]);

    res.status(200).json(
      { 
        success: true,
         monthlyStats: stats[0]
         }
        );
       
  } catch (err) {
    console.error("getMonthlyStats:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getTotalStats = async (req, res) => {
  try {
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid User ID", success: false, data: null });
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
                totalPrice: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$unit", "liter"] },
                      then: { $multiply: ["$price", "$quantityReceived"] }, // liter
                      else: { $multiply: ["$price", "$quantity"] }, // ton/kg
                    },
                  },
                },
                totalQuantity: { $sum: "$quantity" },
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
            $ifNull: [
              { $arrayElemAt: ["$totalRawMaterial.totalQuantity", 0] },
              0,
            ],
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