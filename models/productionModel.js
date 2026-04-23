import mongoose from "mongoose";

const productionSchema = new mongoose.Schema(
  {
    feedName: { type: String, required: true, trim: true },
    formula: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Formula",
      required: true,
    },
    quantity: { type: Number, required: true },
    availableKG: { type: Number, default: 0 },
    unit: {
      type: String,
      enum: ["kg", "liter", "ton"],
      default: "kg",
      required: true,
    },
    scaledIngredients: [
      {
        key: { type: String, required: true },
        percentage: { type: Number, required: true },
        quantityKG: { type: Number, required: true },
        unit: { type: String, enum: ["kg", "liter", "ton"], default: "kg" },
      },
    ],
    totalCost: { type: Number, default: 0 },
    production: { type: Number, default: 0 },
    waste: { type: Number, default: 0, min: [0, "Waste cannot be negative"] },
    status: {
      type: String,
      enum: ["Queued", "Running", "Completed", "Cancelled"],
      default: "Running",
    },
    created: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("production", productionSchema);
