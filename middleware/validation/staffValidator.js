import { body, validationResult } from "express-validator";

export const staffValidator = [
  body("name")
    .escape()
    .trim()
    .isString()
    .withMessage("Name must be a string")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters long"),

  body("role")
    .escape()
    .trim()
    .isString()
    .withMessage("Role must be a string")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Role must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Role must be at least 3 characters long"),

  body("phone")
    .trim()
    .matches(/^[0-9\-]+$/)
    .withMessage("Phone must contain numbers only")
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone must be between 10 and 15 digits"),

  body("address")
    .escape()
    .trim()
    .isString()
    .withMessage("Address must be a string")
    .isLength({ min: 5 })
    .withMessage("Address must be at least 5 characters long"),

  body("status")
    .optional()
    .isIn(["Active", "On Leave", "Inactive"])
    .withMessage("Status must be Active, On Leave, or Inactive"),
];
export const staffUpdateValidator = [
  body("name")
  .optional({ checkFalsy: true })
    .escape()
    .trim()
    .isString()
    .withMessage("Name must be a string")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters long"),

  body("role")
  .optional({ checkFalsy: true })
    .escape()
    .trim()
    .isString()
    .withMessage("Role must be a string")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Role must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Role must be at least 3 characters long"),

  body("phone")
    .trim()
    .matches(/^[0-9\-]+$/)
    .withMessage("Phone must contain numbers only")
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone must be between 10 and 15 digits"),

  body("address")
  .optional({ checkFalsy: true })
    .escape()
    .trim()
    .isString()
    .withMessage("Address must be a string")
    .isLength({ min: 5 })
    .withMessage("Address must be at least 5 characters long"),

  body("status")
    .optional()
    .isIn(["Active", "On Leave", "Inactive"])
    .withMessage("Status must be Active, On Leave, or Inactive"),
];
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      allErrors: errors.array()
    });
  }
  next();
};













