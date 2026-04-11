import { body, validationResult } from "express-validator";

export const categoryValidator = [
  body("categoryName")
    .escape()
    .trim()
    .isString()
    .withMessage("Category name must be a string")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Category name must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Category name must be at least 3 characters long"),

  body("description")
    .escape()
    .trim()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ min: 3 })
    .withMessage("Description must be at least 3 characters long")
    .matches(/^[a-zA-Z\s.,:\-_/]+$/)
    .withMessage(
      "Remove special characters from Description must contain alphabetic characters"
    ),
];

export const categoryUpdateValidator = [
  body("categoryName")
    .optional({ checkFalsy: true })
    .escape()
    .trim()
    .isString()
    .withMessage("Category name must be a string")
    .matches(/^[a-zA-Z\s.,:\-_/]+$/)
    .withMessage("Category name must contain alphabetic characters only")
    .isLength({ min: 3 })
    .withMessage("Category name must be at least 3 characters long"),

  body("description")
    .optional({ checkFalsy: true })
    .escape()
    .trim()
    .isString()
    .withMessage("Description must be a string")
    .isLength({ min: 3 })
    .withMessage("Description must be at least 3 characters long")
    .matches(/^[a-zA-Z\s&.,:\-_/]+$/)
    .withMessage("Description must contain alphabetic characters"),
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