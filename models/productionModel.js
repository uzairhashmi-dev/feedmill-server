import mongoose from "mongoose";

const productionSchema = new mongoose.Schema(
  {
    feedName: { type: String, required: true, trim: true },
    // ✅ Field is "formula" (not "formulaId") — must match populate calls
    formula: { type: mongoose.Schema.Types.ObjectId, ref: "Formula", required: true },
    targetMT: { type: Number, required: true },
    scaledIngredients: [
      {
        key:        { type: String, required: true },
        percentage: { type: Number, required: true },
        quantityKG: { type: Number, required: true },
      },
    ],
    totalCost:  { type: Number, default: 0 },
    production: { type: Number, default: 0 },
    waste:      { type: Number, default: 0, min: [0, "Waste cannot be negative"] },
    status: {
      type: String,
      // ✅ Fixed typo: "Quesed" → "Queued"
      enum: ["Queued", "Running", "Completed", "Cancelled"],
      default: "Running",
    },
    created: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("production", productionSchema);