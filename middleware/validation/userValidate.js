import { body, validationResult } from "express-validator";

export const userValidator = [
  body("fullname")
    .trim()
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Fullname must be alphabetic characters only")
    .isString()
    .withMessage("Fullname must be a string")
    .isLength({ min: 3 })
    .withMessage("Fullname must be at least 3 characters long"),
  body("username")
    .trim()
    .isString()
    .withMessage("Username must be a string")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("email")
  .normalizeEmail()
  .isString()
  .withMessage("Email must be a string")
  .isEmail()
  .withMessage("Invalid email format"),
  body("password")
    .isString()
    .withMessage(" Password must be a string")
    .isLength({ min: 6, max: 20 })
    .withMessage("Password must be 6 to 20 characters long"),
  body("role")
  .optional()
  .isIn(["manager","receptionist", "admin"])
  .withMessage("Invalid role"),
  body("phone")
    .trim() 
    .matches(/^(\+92|92|0)?3\d{2}[- ]?\d{7}$/)
    .withMessage("Enter a valid Pakistani phone number"),
  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ min: 5 })
    .withMessage("Address too short"),

];
export const userUpdateValidator = [
  body("fullname")
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ min: 3 })
    .withMessage("Fullname must be at least 3 characters long"),
  body("password")
    .optional({ checkFalsy: true })
    .isLength({ min: 6, max: 20 })
    .withMessage("Password must be 6 to 20 characters long"),
  body("role").optional({ checkFalsy: true }).isIn(["author", "admin"]).withMessage("Invalid role"),
];
export const userLoginValidator = [
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("password")
    .isLength({ min: 6, max: 20 })
    .withMessage("Password must be 6 to 20 characters long"),
];
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      allEorrors: errors.array(),
    });
  }
  next();
};
