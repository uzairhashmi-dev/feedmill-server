import formulaModel from "../models/formulaModel.js";
import inventoryModel from "../models/inventoryModel.js";
import categoryModel from "../models/categoryModel.js";
import mongoose from "mongoose";


const validateIngredients = (ingredients) => {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return "Ingredients must be a non-empty array";
  }
  for(const ing of ingredients) {
    if (!ing.key || ing.value === undefined) {
      return "Each ingredient must have a 'key' (name) and 'value' (percentage)";
    }
    if (typeof ing.value !== "number" || ing.value <= 0) {
    return `Ingredient '${ing.key}' must have a positive numeric percentage`;
    }
  }
  const total = ingredients.reduce((s, i) => s + i.value, 0);
  if (Math.round(total) !== 100) {
    return `Total percentages must equal 100%. Current: ${total.toFixed(2)}%`;
  }
  return null;
};
const calCostPerMT = async (ingredients) => {
  const MT_IN_KG = 1000;
  let total = 0;
  const missing = [];

  for(const ing of ingredients) {
    const item = await inventoryModel.findOne({
    itemName: { $regex: new RegExp(`^${ing.key}$`, "i") },
    });
  if(!item){
      missing.push(ing.key);
    }else {
      const kgNeeded = (ing.value / 100) * MT_IN_KG;
      total += kgNeeded * item.price;
    }
  }

  return { costPerMT: Math.round(total), missing };
};
export const createFormula = async (req, res) => {
  try {
    const { formulaName, formulaCode, category, ingredients, description } = req.body;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can create a formula",
        success: false,
        data: null,
      });
    }

    // Validate ingredients
    const ingError = validateIngredients(ingredients);
    if (ingError) {
      return res.status(400).json({ message: ingError, success: false, data: null });
    }

    // Duplicate name
    const nameExists = await formulaModel.findOne({
      formulaName: { $regex: new RegExp(`^${formulaName}$`, "i") },
    });
    if (nameExists) {
      return res.status(400).json({
        message: "A formula with this name already exists",
        success: false,
        data: null,
      });
    }

    // Duplicate code
    const codeExists = await formulaModel.findOne({
      formulaCode: { $regex: new RegExp(`^${formulaCode}$`, "i") },
    });
    if (codeExists) {
      return res.status(400).json({
        message: "A formula with this code already exists",
        success: false,
        data: null,
      });
    }

    // Category exists
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Invalid Category ID", success: false, data: null });
    }
    const categoryDoc = await categoryModel.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ message: "Category does not exist", success: false, data: null });
    }

    // Cost calculation + missing check
    const { costPerMT, missing } = await calCostPerMT(ingredients);
    if (missing.length > 0) {
      return res.status(400).json({
        message: `These ingredients are not in inventory: ${missing.join(", ")}`,
        success: false,
        data: null,
      });
    }

    const newFormula = await formulaModel.create({
      formulaName,
      formulaCode,
      category: categoryDoc._id,
      ingredients,
      description,
      costPerMT,
      created: userId,
    });

    return res.status(201).json({
      message: "Formula created successfully",
      success: true,
      data: { formula: newFormula, costPerMT },
    });
  } catch (err) {
    console.error("createFormula:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
export const updateFormula = async (req, res) => {
  try {
    const { id } = req.params;
    const { formulaName, formulaCode, category, ingredients, description } = req.body;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Formula ID", success: false, data: null });
    }
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can update a formula",
        success: false,
        data: null,
      });
    }

    const formula = await formulaModel.findById(id);
    if (!formula) {
      return res.status(404).json({ message: "Formula not found", success: false, data: null });
    }

    if (formulaName) {
      const nameExists = await formulaModel.findOne({
        formulaName: { $regex: new RegExp(`^${formulaName}$`, "i") },
        _id: { $ne: id },
      });
      if (nameExists) {
        return res.status(400).json({
          message: "A formula with this name already exists",
          success: false,
          data: null,
        });
      }
      formula.formulaName = formulaName;
    }

    if (formulaCode) {
      const codeExists = await formulaModel.findOne({
        formulaCode: { $regex: new RegExp(`^${formulaCode}$`, "i") },
        _id: { $ne: id },
      });
      if (codeExists) {
        return res.status(400).json({
          message: "A formula with this code already exists",
          success: false,
          data: null,
        });
      }
      formula.formulaCode = formulaCode;
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: "Invalid Category ID", success: false, data: null });
      }
      const categoryDoc = await categoryModel.findById(category);
      if (!categoryDoc) {
        return res.status(400).json({ message: "Category does not exist", success: false, data: null });
      }
      formula.category = category;
    }

    if (description !== undefined) formula.description = description;

    if (ingredients) {
      const ingError = validateIngredients(ingredients);
      if (ingError) {
        return res.status(400).json({ message: ingError, success: false, data: null });
      }
      const { costPerMT, missing } = await calCostPerMT(ingredients);
      if (missing.length > 0) {
        return res.status(400).json({
          message: `These ingredients are not in inventory: ${missing.join(", ")}`,
          success: false,
          data: null,
        });
      }
      formula.ingredients = ingredients;
      formula.costPerMT   = costPerMT;
    }

    await formula.save();

    return res.status(200).json({
      message: "Formula updated successfully",
      success: true,
      data: formula,
    });
  } catch (err) {
    console.error("updateFormula:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
export const getAllFormulas = async (req, res) => {
  try {
    const userId = req.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const formulas = await formulaModel
      .find()
      .populate("category", "categoryName")
      .populate("created", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Formulas fetched successfully",
      success: true,
      data: formulas,
    });
  } catch (err) {
    console.error("getAllFormulas:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
export const getFormulaById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId  = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Formula ID", success: false, data: null });
    }

    const formula = await formulaModel
      .findById(id)
      .populate("category", "categoryName")
      .populate("created", "name email");

    if (!formula) {
      return res.status(404).json({ message: "Formula not found", success: false, data: null });
    }

    return res.status(200).json({
      message: "Formula fetched successfully",
      success: true,
      data: formula,
    });
  } catch (err) {
    console.error("getFormulaById:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
export const deleteFormula = async (req, res) => {
  try {
    const { id } = req.params;
    const userId   = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Formula ID", success: false, data: null });
    }
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can delete a formula",
        success: false,
        data: null,
      });
    }

    const deleted = await formulaModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Formula not found", success: false, data: null });
    }

    return res.status(200).json({
      message: "Formula deleted successfully",
      success: true,
      data: deleted,
    });
  } catch (err) {
    console.error("deleteFormula:", err);
    return res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};
export const search = async (req, res) => {
  try {
    const userId     = req.id;
    const searchTerm = req.query.search;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }
    if (!searchTerm) {
      return res.status(400).json({ success: false, message: "Search term is required" });
    }

    const results = await formulaModel
      .find({
        $or: [
          { formulaName: { $regex: searchTerm, $options: "i" } },
          { formulaCode: { $regex: searchTerm, $options: "i" } },
        ],
      })
      .populate("category", "categoryName")
      .populate("created", "name email");

    if (!results.length) {
      return res.status(404).json({ success: false, message: "No formulas found" });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("searchFormulas:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};