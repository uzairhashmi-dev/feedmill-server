import { body, validationResult } from "express-validator";

export const createOrderValidator = [
  body("customerName")
    .trim().escape()
    .notEmpty().withMessage("Customer name is required")
    .isLength({ min: 3 }).withMessage("Customer name must be at least 3 characters")
    .matches(/^[a-zA-Z\s]+$/).withMessage("Customer name must contain letters only"),


  body("formulaId")
    .trim()
    .notEmpty().withMessage("Formula ID is required")
    .isMongoId().withMessage("Formula ID must be a valid MongoDB ObjectId"),

  body("quantity")
    .notEmpty().withMessage("Quantity is required")
    .isFloat({ gt: 0 }).withMessage("Quantity must be a positive number"),

  body("unit")
    .notEmpty().withMessage("Unit is required")
    .isIn(["kg", "liter", "ton"]).withMessage("Unit must be kg, liter or ton"),

  body("price")
    .notEmpty().withMessage("Price is required")
    .isFloat({ gt: 0 }).withMessage("Price must be a positive number"),

  body("paymentPaid")
    .optional()
    .isFloat({ min: 0 }).withMessage("Payment paid must be a non-negative number"),

  body("status")
    .optional()
    .isIn(["Pending", "Completed", "Cancelled"])
    .withMessage("Status must be one of: Pending, Completed, Cancelled"),
];

export const updateOrderValidator = [
  body("customerName")
    .optional({ checkFalsy: true })
    .trim().escape()
    .isLength({ min: 3 }).withMessage("Customer name must be at least 3 characters")
    .matches(/^[a-zA-Z\s]+$/).withMessage("Customer name must contain letters only"),

  body("quantity")
    .optional()
    .isFloat({ gt: 0 }).withMessage("Quantity must be a positive number"),

  body("unit")
    .optional()
    .isIn(["kg", "liter", "ton"]).withMessage("Unit must be kg, liter or ton"),

  body("price")
    .optional()
    .isFloat({ gt: 0 }).withMessage("Price must be a positive number"),

  body("paymentPaid")
    .optional()
    .isFloat({ min: 0 }).withMessage("Payment paid must be a non-negative number"),

  body("status")
    .optional()
    .isIn(["Pending", "Completed", "Cancelled"])
    .withMessage("Status must be one of: Pending, Completed, Cancelled"),
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      allErrors: errors.array(),
    });
  }
  next();
};