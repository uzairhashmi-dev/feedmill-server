import { body, validationResult } from "express-validator";

export const inventoryValidator = [
body("itemName")
    .trim()
    .escape()
    .isString()
    .withMessage("Item name must be a string")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Item name must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Item name must be at least 3 characters long"),
  body("unit")
    .trim()
    .escape()
    .isString()
    .withMessage("Unit must be a string")
    .isIn(["kg", "liter","ton"])
    .withMessage("Unit must be one of: kg, liter,ton"),

  body("vendorName")
    .trim()
    .escape()
    .isString()
    .withMessage("Vendor name must be a string")
    .matches(/^[a-zA-Z&./-_=\.(),\s]+$/)
    .withMessage("Vendor name must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Vendor name must be at least 3 characters long"),
  
  body("price")
  .trim()
  .notEmpty()
  .withMessage("Price is required")
  .isFloat({ min: 0 })
  .withMessage("Price must be a non-negative number"),

  body("quantityReceived")
  .trim()
  .notEmpty()
  .withMessage("quantity is required")
  .isFloat({ min: 0 })
  .withMessage("Quantity must be a non-negative number"),


  body("status")
  .optional()
  .trim()
  .isString()
  .withMessage("Status must be a string")
  .isIn(["Pending", "Received", "Placed"])
  .withMessage("Status must be one of: Pending, Received, Placed"),
];

export const updateInventoryValidator = [
  body("itemName")
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isString()
    .withMessage("Item name must be a string")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Item name must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Item name must be at least 3 characters long"),
   body("unit")
    .trim()
    .escape()
    .isString()
    .withMessage("Unit must be a string")
    .isIn(["kg", "liter","ton"])
    .withMessage("Unit must be one of: kg, liter,ton"),
  body("vendorName")
    .optional({ checkFalsy: true })
    .trim()
    .escape()
    .isString()
    .withMessage("Vendor name must be a string")
    .matches(/^[a-zA-Z&./-_=\.,()/\s]+$/)
    .withMessage("vendor name must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Vendor name must be at least 3 characters long"),

  body("price")
    .optional({ checkFalsy: true })
    .trim()
    .isFloat({ min: 0 })
    .withMessage("Price must be a non-negative number"),

  body("quantityReceived")
    .optional({ checkFalsy: true })
    .trim()
    .isFloat({ min: 0 })
    .withMessage("Quantity must be a non-negative number"),
   

  body("status")
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage("Status must be a string")
    .isIn(["Pending", "Received", "Placed"])
    .withMessage("Status must be one of: Pending, Received, Placed"),
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

