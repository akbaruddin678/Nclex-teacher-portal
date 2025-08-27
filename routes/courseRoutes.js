const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware");
const {
  getCourseOutlines,
  addCourseOutline,
} = require("../controllers/courseController");

router.use(protect);

router.post("/add", authorize("admin"), addCourseOutline);

router.get("/access", getCourseOutlines);

module.exports = router;
