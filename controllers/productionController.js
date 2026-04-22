import productionModel from "../models/productionModel.js";
import formulaModel from "../models/formulaModel.js";
import inventoryModel from "../models/inventoryModel.js";
import mongoose from "mongoose";


const toKG = (quantity, unit) => {
  if (unit === "ton")   return quantity * 1000;
  if (unit === "liter") return quantity * 0.9;
  return quantity; 
};

const buildScaledIngredients = async (ingredients, targetKG) => {
  const scaledIngredients = [];
  const missingItems      = [];
  const insufficientItems = [];
  let totalCost = 0;

  for (const ing of ingredients) {
    const inventoryItem = await inventoryModel.findOne({
      itemName: { $regex: new RegExp(`^${ing.key}$`, "i") },
      status: "Received",
    });

    if (!inventoryItem) {
      missingItems.push(ing.key);
      continue;
    }

    const neededKG    = (ing.value / 100) * targetKG;
    // inventory quantity already KG mein stored hai (same as inventory controller)
    const availableKG = inventoryItem.quantity;

    if (availableKG < neededKG) {
      insufficientItems.push({
        key:       ing.key,
        required:  neededKG,
        available: availableKG,
      });
      continue;
    }

    totalCost += neededKG * inventoryItem.price;

    scaledIngredients.push({
      key:        ing.key,
      percentage: ing.value,
      quantityKG: Math.round(neededKG * 100) / 100,
      unit:       inventoryItem.unit,
    });
  }

  return {
    scaledIngredients,
    totalCost:    Math.round(totalCost),
    totalKG:      scaledIngredients.reduce((s, i) => s + i.quantityKG, 0),
    missingItems,
    insufficientItems,
  };
};

// Running ya Completed → inventory minus hogi
const shouldDeduct = (status) =>
  status === "Running" || status === "Completed";

// Inventory se KG minus karo
const deductInventory = async (scaledIngredients) => {
  for (const ing of scaledIngredients) {
    await inventoryModel.findOneAndUpdate(
      { itemName: { $regex: new RegExp(`^${ing.key}$`, "i") }, status: "Received" },
      { $inc: { quantity: -ing.quantityKG } }
    );
  }
};

// Inventory mein KG wapas karo
const restoreInventory = async (scaledIngredients) => {
  for (const ing of scaledIngredients) {
    await inventoryModel.findOneAndUpdate(
      { itemName: { $regex: new RegExp(`^${ing.key}$`, "i") }, status: "Received" },
      { $inc: { quantity: ing.quantityKG } }
    );
  }
};

export const createProduction = async (req, res) => {
  try {
    const { feedName, formulaId, quantity, unit, waste, status } = req.body;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({ message: "Forbidden – only admin or manager can create production", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(formulaId)) {
      return res.status(400).json({ message: "Invalid Formula ID", success: false, data: null });
    }
    if (!feedName || quantity === undefined || !unit || waste === undefined) {
      return res.status(400).json({ message: "feedName, quantity, unit and waste are required", success: false, data: null });
    }
    if (!["kg", "liter", "ton"].includes(unit)) {
      return res.status(400).json({ message: "unit must be kg, liter or ton", success: false, data: null });
    }
    if (Number(quantity) <= 0) {
      return res.status(400).json({ message: "quantity must be greater than 0", success: false, data: null });
    }
    if (Number(waste) < 0) {
      return res.status(400).json({ message: "waste cannot be negative", success: false, data: null });
    }

    const nameExists = await productionModel.findOne({
      feedName: { $regex: new RegExp(`^${feedName}$`, "i") },
    });
    if (nameExists) {
      return res.status(400).json({ message: "A batch with this name already exists", success: false, data: null });
    }

    const formula = await formulaModel.findById(formulaId);
    if (!formula) {
      return res.status(404).json({ message: "Formula not found", success: false, data: null });
    }

    // quantity ko KG mein convert karo — same jaise inventory controller karta hai
    const targetKG = toKG(Number(quantity), unit);

    const { scaledIngredients, totalCost, totalKG, missingItems, insufficientItems } =
      await buildScaledIngredients(formula.ingredients, targetKG);

    if (missingItems.length > 0) {
      return res.status(400).json({ message: `These ingredients are not in inventory: ${missingItems.join(", ")}`, success: false, data: null });
    }
    if (insufficientItems.length > 0) {
      const details = insufficientItems
        .map((i) => `${i.key} (required: ${i.required}kg, available: ${i.available}kg)`)
        .join(" | ");
      return res.status(400).json({ message: `Insufficient stock: ${details}`, success: false, data: null });
    }

    if (Number(waste) >= totalKG) {
      return res.status(400).json({
        message: `Waste (${waste}kg) cannot be greater than or equal to total production (${totalKG}kg)`,
        success: false,
        data: null,
      });
    }

    const resolvedStatus = status || "Running";
    const productionKG   = totalKG - Number(waste);

    // Running ya Completed hai tu inventory minus karo
    if (shouldDeduct(resolvedStatus)) {
      await deductInventory(scaledIngredients);
    }

    const newProduction = await productionModel.create({
      feedName,
      formula:           formulaId,
      quantity:          Number(quantity),
      unit,
      scaledIngredients,
      production:        productionKG,
      waste:             Number(waste),
      totalCost,
      status:            resolvedStatus,
      created:           userId,
    });

    return res.status(201).json({
      message: "Production batch created successfully",
      success: true,
      data: newProduction,
    });
  } catch (err) {
    console.error("createProduction:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
export const updateProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedName, formulaId, quantity, unit, waste, status } = req.body;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Production ID", success: false, data: null });
    }
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({ message: "Forbidden – only admin or manager can update production", success: false, data: null });
    }

    const prod = await productionModel.findById(id);
    if (!prod) {
      return res.status(404).json({ message: "Production not found", success: false, data: null });
    }

    const oldStatus = prod.status;
    const newStatus = status || oldStatus;

    if (feedName) prod.feedName = feedName;

    const formulaChanged  = formulaId && formulaId !== prod.formula?.toString();
    const quantityChanged = quantity !== undefined && Number(quantity) !== prod.quantity;
    const unitChanged     = unit && unit !== prod.unit;

    if (formulaChanged || quantityChanged || unitChanged) {
      const resolvedFormulaId = formulaChanged  ? formulaId        : prod.formula?.toString();
      const resolvedQuantity  = quantityChanged ? Number(quantity) : prod.quantity;
      const resolvedUnit      = unitChanged     ? unit             : prod.unit;

      if (!["kg", "liter", "ton"].includes(resolvedUnit)) {
        return res.status(400).json({ message: "unit must be kg, liter or ton", success: false, data: null });
      }
      if (!mongoose.Types.ObjectId.isValid(resolvedFormulaId)) {
        return res.status(400).json({ message: "Invalid Formula ID", success: false, data: null });
      }

      const formula = await formulaModel.findById(resolvedFormulaId);
      if (!formula) {
        return res.status(404).json({ message: "Formula not found", success: false, data: null });
      }

      const targetKG = toKG(resolvedQuantity, resolvedUnit);
      const { scaledIngredients, totalCost, totalKG, missingItems, insufficientItems } =
        await buildScaledIngredients(formula.ingredients, targetKG);

      if (missingItems.length > 0) {
        return res.status(400).json({ message: `These ingredients are not in inventory: ${missingItems.join(", ")}`, success: false, data: null });
      }
      if (insufficientItems.length > 0) {
        const details = insufficientItems
          .map((i) => `${i.key} (required: ${i.required}kg, available: ${i.available}kg)`)
          .join(" | ");
        return res.status(400).json({ message: `Insufficient stock: ${details}`, success: false, data: null });
      }

      const resolvedWaste = waste !== undefined ? Number(waste) : prod.waste;
      if (resolvedWaste < 0) {
        return res.status(400).json({ message: "waste cannot be negative", success: false, data: null });
      }
      if (resolvedWaste >= totalKG) {
        return res.status(400).json({
          message: `Waste (${resolvedWaste}kg) cannot be greater than or equal to production (${totalKG}kg)`,
          success: false,
          data: null,
        });
      }

      // Pehli inventory restore karo, phir nai deduct karo
      if (shouldDeduct(oldStatus)) await restoreInventory(prod.scaledIngredients);
      if (shouldDeduct(newStatus)) await deductInventory(scaledIngredients);

      prod.formula           = formula._id;
      prod.quantity          = resolvedQuantity;
      prod.unit              = resolvedUnit;
      prod.scaledIngredients = scaledIngredients;
      prod.totalCost         = totalCost;
      prod.waste             = resolvedWaste;
      prod.production        = totalKG - resolvedWaste;

    } else if (waste !== undefined) {
      // Sirf waste change hua
      const currentTotalKG = prod.scaledIngredients.reduce((s, i) => s + i.quantityKG, 0);
      if (Number(waste) < 0) {
        return res.status(400).json({ message: "waste cannot be negative", success: false, data: null });
      }
      if (Number(waste) >= currentTotalKG) {
        return res.status(400).json({
          message: `Waste (${waste}kg) cannot be greater than or equal to production (${currentTotalKG}kg)`,
          success: false,
          data: null,
        });
      }
      prod.waste      = Number(waste);
      prod.production = currentTotalKG - Number(waste);
    }

    // ── Status change — hamesha independent check ─────────────
    if (oldStatus !== newStatus && !(formulaChanged || quantityChanged || unitChanged)) {
      const wasDeducted = shouldDeduct(oldStatus);
      const willDeduct  = shouldDeduct(newStatus);

      if (!wasDeducted && willDeduct) {
        // Queued/Cancelled → Running/Completed
        await deductInventory(prod.scaledIngredients);
      } else if (wasDeducted && !willDeduct) {
        // Running/Completed → Queued/Cancelled
        await restoreInventory(prod.scaledIngredients);
      }
    }

    prod.status = newStatus;
    await prod.save();

    return res.status(200).json({ message: "Production updated successfully", success: true, data: prod });
  } catch (err) {
    console.error("updateProduction:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
export const getAllProductions = async (req, res) => {
  try {
    const userId = req.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const productions = await productionModel
      .find()
      .populate("formula", "formulaName formulaCode costPerMT")
      .populate("created", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Productions fetched successfully",
      success: true,
      data: productions,
    });
  } catch (err) {
    console.error("getAllProductions:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
export const getProductionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId  = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Production ID", success: false, data: null });
    }

    const prod = await productionModel
      .findById(id)
      .populate("formula", "formulaName formulaCode ingredients costPerMT")
      .populate("created", "name email");

    if (!prod) {
      return res.status(404).json({ message: "Production not found", success: false, data: null });
    }

    return res.status(200).json({ message: "Production fetched successfully", success: true, data: prod });
  } catch (err) {
    console.error("getProductionById:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
// export const deleteProduction = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId   = req.id;
//     const userRole = req.role;

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
//     }
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Invalid Production ID", success: false, data: null });
//     }
//     if (userRole !== "admin" && userRole !== "manager") {
//       return res.status(403).json({
//         message: "Forbidden – only admin or manager can delete a production",
//         success: false,
//         data: null,
//       });
//     }

//     const deleted = await productionModel.findByIdAndDelete(id);
//     if (!deleted) {
//       return res.status(404).json({ message: "Production not found", success: false, data: null });
//     }

//     return res.status(200).json({ message: "Production deleted successfully", success: true, data: deleted });
//   } catch (err) {
//     console.error("deleteProduction:", err);
//     return res.status(500).json({ message: "Server Error", success: false, data: null });
//   }
// };
export const searchProduction = async (req, res) => {
  try {
    const userId     = req.id;
    const searchTerm = req.query.search;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!searchTerm) {
      return res.status(400).json({ success: false, message: "Search term is required" });
    }

    const results = await productionModel
      .find({
        $or: [
          { feedName: { $regex: searchTerm, $options: "i" } },
          { status:   { $regex: searchTerm, $options: "i" } },
        ],
      })
      .populate("formula", "formulaName formulaCode")
      .populate("created", "name email");

    if (!results.length) {
      return res.status(404).json({ success: false, message: "No production found" });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("searchProduction:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getProductionMonthlyStats = async (req, res) => {
  try {
    const userId = req.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const stats = await productionModel.aggregate([
      {
        $facet: {
          // Is mahine ki total batches
          totalBatches: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $count: "count" },
          ],
          // Is mahine completed batches
          completedBatches: [
            { $match: { status: "Completed", createdAt: { $gte: startOfMonth } } },
            { $count: "count" },
          ],
          // Running batches (overall — ongoing)
          runningBatches: [
            { $match: { status: "Running" } },
            { $count: "count" },
          ],
          // Queued batches (overall — pending)
          queuedBatches: [
            { $match: { status: "Queued" } },
            { $count: "count" },
          ],
          // Cancelled batches (overall)
          cancelledBatches: [
            { $match: { status: "Cancelled" } },
            { $count: "count" },
          ],
          // Is mahine ki cost + production + waste — sirf Completed
          thisMonthStats: [
            {
              $match: {
                createdAt: { $gte: startOfMonth },
                status: { $in: ["Completed", "Running"] },
              },
            },
            {
              $group: {
                _id:                null,
                monthlyTotalCost:   { $sum: "$totalCost" },
                monthlyProduction:  { $sum: "$production" },  // KG output
                monthlyWaste:       { $sum: "$waste" },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalBatches: {
            $ifNull: [{ $arrayElemAt: ["$totalBatches.count",     0] }, 0],
          },
          completedBatches: {
            $ifNull: [{ $arrayElemAt: ["$completedBatches.count", 0] }, 0],
          },
          runningBatches: {
            $ifNull: [{ $arrayElemAt: ["$runningBatches.count",   0] }, 0],
          },
          queuedBatches: {
            $ifNull: [{ $arrayElemAt: ["$queuedBatches.count",    0] }, 0],
          },
          cancelledBatches: {
            $ifNull: [{ $arrayElemAt: ["$cancelledBatches.count", 0] }, 0],
          },
          thisMonthTotalCost: {
            $ifNull: [{ $arrayElemAt: ["$thisMonthStats.monthlyTotalCost",  0] }, 0],
          },
          thisMonthProduction: {
            $ifNull: [{ $arrayElemAt: ["$thisMonthStats.monthlyProduction", 0] }, 0],
          },
          thisMonthWaste: {
            $ifNull: [{ $arrayElemAt: ["$thisMonthStats.monthlyWaste",      0] }, 0],
          },
        },
      },
    ]);

    return res.status(200).json({
      success:      true,
      monthlyStats: stats[0],
    });

    
  } catch (err) {
    console.error("getProductionMonthlyStats:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getProductionTotalStats = async (req, res) => {
  try {
    const userId = req.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const stats = await productionModel.aggregate([
      {
        $facet: {
          // Overall total batches
          totalBatches: [{ $count: "count" }],

          // Status-wise counts
          completedBatches: [{ $match: { status: "Completed" } }, { $count: "count" }],
          runningBatches:   [{ $match: { status: "Running"   } }, { $count: "count" }],
          queuedBatches:    [{ $match: { status: "Queued"    } }, { $count: "count" }],
          cancelledBatches: [{ $match: { status: "Cancelled" } }, { $count: "count" }],

          // Overall totals — sirf Completed batches se
          overallStats: [
            { $match: { status: { $in: ["Completed", "Running"] } } },
            {
              $group: {
                _id:            null,
                totalCost:      { $sum: "$totalCost" },
                totalProduction:{ $sum: "$production" }, // total KG output
                totalWaste:     { $sum: "$waste" },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalBatches: {
            $ifNull: [{ $arrayElemAt: ["$totalBatches.count",      0] }, 0],
          },
          completedBatches: {
            $ifNull: [{ $arrayElemAt: ["$completedBatches.count",  0] }, 0],
          },
          runningBatches: {
            $ifNull: [{ $arrayElemAt: ["$runningBatches.count",    0] }, 0],
          },
          queuedBatches: {
            $ifNull: [{ $arrayElemAt: ["$queuedBatches.count",     0] }, 0],
          },
          cancelledBatches: {
            $ifNull: [{ $arrayElemAt: ["$cancelledBatches.count",  0] }, 0],
          },
          totalCost: {
            $ifNull: [{ $arrayElemAt: ["$overallStats.totalCost",       0] }, 0],
          },
          totalProduction: {
            $ifNull: [{ $arrayElemAt: ["$overallStats.totalProduction",  0] }, 0],
          },
          totalWaste: {
            $ifNull: [{ $arrayElemAt: ["$overallStats.totalWaste",       0] }, 0],
          },
        },
      },
    ]);

    return res.status(200).json({
      success:    true,
      totalStats: stats[0],
    });
  } catch (err) {
    console.error("getProductionTotalStats:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


