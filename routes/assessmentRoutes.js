const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware");
const {
  addAssessment,
  addBulkAssessments,
  getStudentAssessments,
} = require("../controllers/assessmentController");

// Apply middleware to all routes
router.use(protect);

router.post("/", authorize("teacher"), addAssessment);
router.post("/bulk", authorize("teacher"), addBulkAssessments);
router.get(
  "/student/:studentId/course/:courseId",
  authorize("teacher", "student"),
  getStudentAssessments
);

module.exports = router;
