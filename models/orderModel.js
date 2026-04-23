import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customerName:   { type: String, required: true, trim: true },
    formula:        { type: mongoose.Schema.Types.ObjectId, ref: "Formula", required: true },
    quantity:       { type: Number, required: true, min: 0 },
    unit:           { type: String, enum: ["kg", "liter", "ton"], default: "kg", required: true },
    quantityKG:     { type: Number, required: true },
    price:          { type: Number, required: true, min: 0 },
    totalPayment:   { type: Number, required: true, min: 0 },
    paymentPaid:    { type: Number, default: 0, min: 0 },
    paymentPending: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
    },
    created: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("order", orderSchema);