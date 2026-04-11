import categoryModel from "../models/categoryModel.js";
import mongoose from "mongoose";

// ─── Create Category ──────────────────────────────────────────────────────────
export const createCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can create a category",
        success: false,
        data: null,
      });
    }

    const alreadyExists = await categoryModel.findOne({
      categoryName: { $regex: new RegExp(`^${categoryName}$`, "i") },
    });
    if (alreadyExists) {
      return res.status(400).json({
        message: "This category already exists",
        success: false,
        data: null,
      });
    }

    const newCategory = await categoryModel.create({ categoryName, description });

    res.status(201).json({
      message: "Category created successfully",
      success: true,
      data: newCategory,
    });
  } catch (err) {
    console.error("createCategory:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Update Category ──────────────────────────────────────────────────────────
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, description } = req.body;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Category ID", success: false, data: null });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can update a category",
        success: false,
        data: null,
      });
    }

    const category = await categoryModel.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found", success: false, data: null });
    }

    if (categoryName) {
      const nameExists = await categoryModel.findOne({
        categoryName: { $regex: new RegExp(`^${categoryName}$`, "i") },
        _id: { $ne: id },
      });
      if (nameExists) {
        return res.status(400).json({
          message: "Category name already exists",
          success: false,
          data: null,
        });
      }
      category.categoryName = categoryName;
    }

    // Allow clearing description by passing empty string
    if (description !== undefined) category.description = description;

    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("updateCategory:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Get All Categories ───────────────────────────────────────────────────────
// BUG FIX: was returning 404 when no categories — now always returns 200 + []
export const getAllCategories = async (req, res) => {
  try {
    const userId = req.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    const categories = await categoryModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Categories fetched successfully",
      success: true,
      data: categories,
    });
  } catch (err) {
    console.error("getAllCategories:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Get Single Category ──────────────────────────────────────────────────────
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Category ID", success: false, data: null });
    }

    const category = await categoryModel.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found", success: false, data: null });
    }

    res.status(200).json({
      message: "Category fetched successfully",
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("getCategoryById:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Delete Category ──────────────────────────────────────────────────────────
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Category ID", success: false, data: null });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden – only admin or manager can delete a category",
        success: false,
        data: null,
      });
    }

    const deletedCategory = await categoryModel.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found", success: false, data: null });
    }

    res.status(200).json({
      message: "Category deleted successfully",
      success: true,
      data: deletedCategory,
    });
  } catch (err) {
    console.error("deleteCategory:", err);
    res.status(500).json({ message: "Server Error", success: false, data: null });
  }
};

// ─── Search Categories ────────────────────────────────────────────────────────
export const search = async (req, res) => {
  try {
    const userId = req.id;
    const searchTerm = req.query.search;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID", success: false, data: null });
    }

    if (!searchTerm) {
      return res.status(400).json({ success: false, message: "Search term is required" });
    }

    const results = await categoryModel.find({
      $or: [
        { categoryName: { $regex: searchTerm, $options: "i" } },
        { description:  { $regex: searchTerm, $options: "i" } },
      ],
    });

    if (!results.length) {
      return res.status(404).json({ success: false, message: "No categories found" });
    }

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("searchCategories:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};