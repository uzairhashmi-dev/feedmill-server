import staffModel from "../models/staffModel.js";
import mongoose from "mongoose";


// Create Staff
export const createStaff = async (req, res) => {
  try {


    const { name, role, phone, address, status } = req.body;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid User ID",
        success: false,
        data: null,
      });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden - Only admin or manager can create staff",
        success: false,
        data: null,
      });
    }

    const alreadyExists = await staffModel.findOne({
      $or: [
        { phone: phone },
        {name:name}
      ],
    });
    if (alreadyExists) {
      return res.status(400).json({
        message:"This staff already exists with  same name or phone number",
        success: false,
        data: null,
      });
    }

    const newStaff = await staffModel.create({ name, role, phone, address, status });
    if (!newStaff) {
      return res.status(400).json({
        message: "Staff not created",
        success: false,
        data: null,
      });
    }

    res.status(200).json({
      message: "Staff created successfully",
      success: true,
      data: newStaff,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server Error",
      success: false,
      data: null,
    });
  }
};

// Update Staff
export const updateStaff = async (req, res) => {
  try {
   

    const { id } = req.params;
    const { name, role, phone, address, status } = req.body;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid User ID",
        success: false,
        data: null,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Staff ID",
        success: false,
        data: null,
      });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden - Only admin or manager can update staff",
        success: false,
        data: null,
      });
    }

    const staff = await staffModel.findById(id);
    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        success: false,
        data: null,
      });
    }

    if (phone) {
      const phoneExists = await staffModel.findOne({
        phone: phone,
        _id: { $ne: id },
      });
      if (phoneExists) {
        return res.status(400).json({
          message: "Phone number already exists",
          success: false,
          data: null,
        });
      }
      staff.phone = phone;
    }

    if (name) staff.name = name;
    if (role) staff.role = role;
    if (address) staff.address = address;
    if (status) staff.status = status;

    await staff.save();

    res.status(200).json({
      message: "Staff updated successfully",
      success: true,
      data: staff,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server Error",
      success: false,
      data: null,
    });
  }
};

// Get All Staff
export const getAllStaff = async (req, res) => {
  try {
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid User ID",
        success: false,
        data: null,
      });
    }

    const staffList = await staffModel.find();
    if (!staffList) {
      return res.status(404).json({
        message: "No staff found",
        success: false,
        data: null,
      });
    }

    res.status(200).json({
      message: "Staff fetched successfully",
      success: true,
      data: staffList,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server Error",
      success: false,
      data: null,
    });
  }
};

// Get Single Staff
export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid User ID",
        success: false,
        data: null,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Staff ID",
        success: false,
        data: null,
      });
    }

    const staff = await staffModel.findById(id);
    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        success: false,
        data: null,
      });
    }

    res.status(200).json({
      message: "Staff fetched successfully",
      success: true,
      data: staff,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server Error",
      success: false,
      data: null,
    });
  }
};

// Delete Staff
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const userRole = req.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid User ID",
        success: false,
        data: null,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Staff ID",
        success: false,
        data: null,
      });
    }

    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        message: "Forbidden - Only admin or manager can delete staff",
        success: false,
        data: null,
      });
    }

    const deletedStaff = await staffModel.findByIdAndDelete(id);
    if (!deletedStaff) {
      return res.status(404).json({
        message: "Staff not found",
        success: false,
        data: null,
      });
    }

    res.status(200).json({
      message: "Staff deleted successfully",
      success: true,
      data: deletedStaff,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server Error",
      success: false,
      data: null,
    });
  }
};