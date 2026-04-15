import productionModel from "../models/productionModel.js";
import formulaModel from "../models/formulaModel.js";
import inventoryModel from "../models/inventoryModel.js";
import mongoose from "mongoose";

const MT_IN_KG = 1000;

const buildScaledIngredients = async (ingredients, targetMT) => {
  const scaledIngredients = [];
  const missingItems      = [];
  const insufficientItems = [];
  let totalCost = 0;

  for (const ing of ingredients) {
    const inventoryItem = await inventoryModel.findOne({
      itemName: { $regex: new RegExp(`^${ing.key}$`, "i") },
      status: "Received", // Only count received stock
    });

    if (!inventoryItem) {
      missingItems.push(ing.key);
      continue;
    }

    const quantityKG = (ing.value / 100) * targetMT * MT_IN_KG;

    if (inventoryItem.quantity < quantityKG) {
      insufficientItems.push({
        key:       ing.key,
        required:  quantityKG,
        available: inventoryItem.quantity,
      });
      continue;
    }

    totalCost += quantityKG * inventoryItem.price;
    scaledIngredients.push({
      key:        ing.key,
      percentage: ing.value,
      quantityKG: Math.round(quantityKG * 100) / 100,
    });
  }

  return {
    scaledIngredients,
    totalCost: Math.round(totalCost),
    missingItems,
    insufficientItems,
  };
};

export const createProduction = async (req, res) => {
  try {
    const { feedName, formulaId, targetMT, status } = req.body;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can create a production",
        success: false,
        data: null,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(formulaId)) {
      return res.status(400).json({ message: "Invalid Formula ID", success: false, data: null });
    }

    // ✅ BUG FIX: was checking formulaModel for feedName — should check productionModel
    const nameExists = await productionModel.findOne({
      feedName: { $regex: new RegExp(`^${feedName}$`, "i") },
    });
    if (nameExists) {
      return res.status(400).json({
        message: "A batch with this name already exists",
        success: false,
        data: null,
      });
    }

    const formula = await formulaModel.findById(formulaId);
    if (!formula) {
      return res.status(404).json({ message: "Formula not found", success: false, data: null });
    }

    const { scaledIngredients, totalCost, missingItems, insufficientItems } =
      await buildScaledIngredients(formula.ingredients, Number(targetMT));

    if (missingItems.length > 0) {
      return res.status(400).json({
        message: `Ingredients missing from inventory: ${missingItems.join(", ")}`,
        success: false,
        data: null,
      });
    }

    if (insufficientItems.length > 0) {
      const details = insufficientItems
        .map((i) => `${i.key} (need: ${i.required}kg, have: ${i.available}kg)`)
        .join(" | ");
      return res.status(400).json({
        message: `Insufficient stock: ${details}`,
        success: false,
        data: null,
      });
    }

    const totalQuantityKG = scaledIngredients.reduce((s, i) => s + i.quantityKG, 0);

    // ✅ BUG FIX: store as `formula` (schema field), not `formulaId`
    const newProduction = await productionModel.create({
      feedName,
      formula:           formulaId,
      targetMT:          Number(targetMT),
      scaledIngredients,
      production:        totalQuantityKG,
      totalCost,
      status:            status || "Running",
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
    const { feedName, formulaId, targetMT, waste, status } = req.body;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        message: "Invalid User ID", success: false, data: null 
      });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: "Invalid Production ID", success: false, data: null 
      });
    }
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can update a production",
        success: false,
        data: null,
      });
    }

    const prod = await productionModel.findById(id);
    if (!prod) {
      return res.status(404).json({ 
        message: "Production not found", success: false, data: null 
      });
    }

    // ── Basic field updates ───────────────────────────────────────────
    if (feedName)            prod.feedName = feedName;
    if (waste !== undefined) prod.waste    = waste;
    if (status)              prod.status   = status;

    // ── FIX: Only recalculate if formula OR targetMT actually CHANGED ─
    // Compare new value with existing stored value
    const formulaChanged = formulaId &&
                           formulaId !== prod.formula?.toString();
                           // prod.formula is ObjectId → toString() for compare

    const targetChanged  = targetMT  &&
                           Number(targetMT) !== prod.targetMT;

    if (formulaChanged || targetChanged) {
      // Use new value if changed, otherwise keep existing
      const resolvedFormulaId = formulaChanged ? formulaId 
                                               : prod.formula?.toString();
      const resolvedTargetMT  = targetChanged  ? Number(targetMT)  
                                               : prod.targetMT;

      if (!mongoose.Types.ObjectId.isValid(resolvedFormulaId)) {
        return res.status(400).json({ 
          message: "Invalid Formula ID", success: false, data: null 
        });
      }

      const formula = await formulaModel.findById(resolvedFormulaId);
      if (!formula) {
        return res.status(404).json({ 
          message: "Formula not found", success: false, data: null 
        });
      }

      const {
        scaledIngredients,
        totalCost,
        missingItems,
        insufficientItems,
      } = await buildScaledIngredients(formula.ingredients, resolvedTargetMT);

      if (missingItems.length > 0) {
        return res.status(400).json({
          message: `Ingredients missing from inventory: ${missingItems.join(", ")}`,
          success: false,
          data: null,
        });
      }
      if (insufficientItems.length > 0) {
        const details = insufficientItems
          .map((i) => `${i.key} (need: ${i.required}kg, have: ${i.available}kg)`)
          .join(" | ");
        return res.status(400).json({ 
          message: `Insufficient stock: ${details}`, 
          success: false, 
          data: null 
        });
      }

      prod.formula           = formula._id;
      prod.targetMT          = resolvedTargetMT;
      prod.scaledIngredients = scaledIngredients;
      prod.totalCost         = totalCost;
      prod.production        = scaledIngredients.reduce(
        (s, i) => s + i.quantityKG, 0
      );
    }

    await prod.save();
    return res.status(200).json({ 
      message: "Production updated successfully", 
      success: true, 
      data: prod 
    });

  } catch (err) {
    console.error("updateProduction:", err);
    return res.status(500).json({ 
      message: "Server Error", success: false, data: null 
    });
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

export const deleteProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Production ID", success: false, data: null });
    }
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can delete a production",
        success: false,
        data: null,
      });
    }

    const deleted = await productionModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Production not found", success: false, data: null });
    }

    return res.status(200).json({ message: "Production deleted successfully", success: true, data: deleted });
  } catch (err) {
    console.error("deleteProduction:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};


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