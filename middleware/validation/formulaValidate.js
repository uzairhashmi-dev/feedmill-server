import { body, validationResult } from "express-validator";

export const formulaValidator = [
  body("formulaName")
    .escape()
    .trim()
    .isString()
    .withMessage("Formula name must be a string")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage("Formula name must contain alphanumeric characters only")
    .isLength({ min: 3 })
    .withMessage("Formula name must be at least 3 characters long"),

  body("formulaCode")
    .escape()
    .trim()
    .isString()
    .withMessage("Formula code must be a string")
    .matches(/^[a-zA-Z0-9\-.,/*()_]+$/)
    .withMessage("Formula code must contain alphanumeric characters only")
    .isLength({ min: 2 })
    .withMessage("Formula code must be at least 2 characters long"),

  body("category")
  .trim()
  .notEmpty()
  .withMessage("Category is required")
  .isMongoId()
  .withMessage("Category must be a valid MongoDB ObjectId"),

  body("ingredients")
    .isArray({ min: 1 })
    .withMessage("Ingredients must be a non-empty array"),

  body("ingredients.*.key")
    .escape()
    .trim()
    .isString()
    .withMessage("Each ingredient key must be a string")
    .isLength({ min: 3 })
    .withMessage("Each ingredient key must be at least 3 characters & send array key as 'key'and value as 'value'"),

  body("ingredients.*.value")
    .isFloat({ gt: 0 })
    .withMessage("Each ingredient value must be a positive number"),
 body("description")
      .escape()
        .trim()
        .isString()
        .withMessage("Description must be a string")
        .isLength({ min: 3 })
        .withMessage("Description must be at least 10 characters long")
        .matches(/^[a-zA-Z\s.,:\-_/]+$/)
        .withMessage(" Description must contain alphabetic characters"),


];

export const formulaUpdateValidator = [
  body("formulaName")
    .optional({ checkFalsy: true })
    .escape()
    .trim()
    .isString()
    .withMessage("Formula name must be a string")
    .matches(/^[a-zA-Z0-9\s\-./,()_]+$/)
    .withMessage("Formula name must contain alphanumeric characters only")
    .isLength({ min: 3 })
    .withMessage("Formula name must be at least 3 characters long"),

  body("formulaCode")
    .optional({ checkFalsy: true })
    .escape()
    .trim()
    .isString()
    .withMessage("Formula code must be a string")
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage("Formula code must contain alphanumeric characters only")
    .isLength({ min: 2 })
    .withMessage("Formula code must be at least 2 characters long"),

  body("category")
  .optional({ checkFalsy: true })
  .trim()
  .isMongoId()
  .withMessage("Category must be a valid MongoDB ObjectId"),

  body("ingredients")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Ingredients must be a non-empty array"),

  body("ingredients.*.key")
    .optional()
    .escape()
    .trim()
    .isString()
    .withMessage("Each ingredient key must be a string")
    .isLength({ min: 3 })
    .withMessage("Each ingredient key must be at least 3 characters & send array key as 'key'and value as 'value'"),

  body("ingredients.*.value")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Each ingredient value must be a positive number"),
    body("description")
        .optional({ checkFalsy: true })
        .escape()
        .trim()
        .isString()
        .withMessage("Description must be a string")
        .isLength({ min: 3 })
        .withMessage("Description must be at least 10 characters long")
        .matches(/^[a-zA-Z\s.,:\-_/]+$/)
        .withMessage(" Description must contain alphabetic characters"),
  body("createdBy")
  .optional({ checkFalsy: true })
    .trim()
    .isString()
    .isMongoId()
    .withMessage("createdBy must be a valid MongoDB ObjectId"),
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