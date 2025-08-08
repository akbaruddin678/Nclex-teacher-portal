const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware");
const {
  createCourse,
  addBulkStudentsToCourse,
  addCourseOutline,
  getCourseOutlines,
} = require("../controllers/courseController");

router.use(protect);

router.post("/", authorize("admin"), createCourse);
router.post(
  "/:courseId/students/bulk",
  authorize("admin"),
  addBulkStudentsToCourse
);
router.post("/:courseId/outline", authorize("teacher"), addCourseOutline);
router.get("/:courseId/outline", getCourseOutlines);

module.exports = router;
