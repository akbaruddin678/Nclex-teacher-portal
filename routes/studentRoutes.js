const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getStudentProfile } = require("../controllers/studentController");

// Protect all routes
router.use(protect);

router.get("/me", getStudentProfile);

module.exports = router;
