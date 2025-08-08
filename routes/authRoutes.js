const express = require("express");
const { check } = require("express-validator");
const {
  registerAdmin,
  login,
  getMe,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/admin/register",
  [
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
    check("name", "Name is required").not().isEmpty(),
    check("contactNumber", "Contact number is required").not().isEmpty(),
  ],
  registerAdmin
);

router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  login
);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

module.exports = router;
