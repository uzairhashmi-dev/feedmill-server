import { body, validationResult } from "express-validator";

export const productionValidator = [
  body("feedName")
    .escape()
    .trim()
    .isString()
    .withMessage("Feed name must be a string")
    .isLength({ min: 3 })
    .withMessage("Feed name must be at least 3 characters long")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage("Feed name must contain alphanumeric characters only"),

  body("formulaId")
    .trim()
    .notEmpty()
    .withMessage("Formula is required")
    .isMongoId()
    .withMessage("Formula must be a valid MongoDB ObjectId"),

  body("quantity")
    .notEmpty()
    .withMessage("quantity is required")
    .isFloat({ gt: 0 })
    .withMessage("quantity must be a positive number"),

  body("status")
    .optional()
    .isIn([ "Running", "Completed", "Cancelled","Queued",])
    .withMessage("Status must be one of: Queued, Running, Completed, Cancelled"),
];

export const productionUpdateValidator = [
  body("feedName")
    .optional({ checkFalsy: true })
    .escape()
    .trim()
    .isString()
    .withMessage("Feed name must be a string")
    .isLength({ min: 3 })
    .withMessage("Feed name must be at least 3 characters long")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage("Feed name must contain alphanumeric characters only"),

  // ── FIX: was body("formula"), must match req.body.formulaId ──
  body("formulaId")
    .optional({ checkFalsy: true })
    .trim()
    .isMongoId()
    .withMessage("Formula must be a valid MongoDB ObjectId"),

  body("quantity")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("quantity must be a positive number"),

  body("waste")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Waste must be a non-negative number"),

  body("status")
    .optional()
    .isIn(["Queued", "Running", "Completed", "Cancelled"])
    .withMessage("Status must be one of: Queued, Running, Completed, Cancelled"),
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


