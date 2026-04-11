import mongoose from "mongoose";

const formulaSchema = new mongoose.Schema(
  {
    formulaName: { type: String, required: true, trim: true },
    formulaCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
    description: { type: String, trim: true, default: "" },
    ingredients: [{ key: String, value: Number }],
    costPerMT: { type: Number, default: 0 },
    // BUG NOTE: field is "created" not "createdBy" — populate must use "created"
    created: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Formula", formulaSchema);
