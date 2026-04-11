import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    name:{
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "On Leave", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Staff", staffSchema);