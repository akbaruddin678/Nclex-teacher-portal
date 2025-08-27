// routes/assessmentRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware"); // your auth middlewares
const ctrl = require("../controllers/assessmentController");

router.use(protect);

// Allow admins/principals/teachers to manage + view
const MANAGE = authorize("admin", "principal", "teacher");

// Create or upsert a batch (writes all rows)
router.post("/", MANAGE, ctrl.upsertAssessmentBatch);

// Course-batches list
router.get("/course/:courseId", MANAGE, ctrl.getCourseAssessmentBatches);

// Single batch CRUD
router.get("/:batchId", MANAGE, ctrl.getAssessmentBatch);
router.patch("/:batchId", MANAGE, ctrl.updateBatchMeta);

// Marks (also adds students if not already in batch)
router.put("/:batchId/marks", MANAGE, ctrl.updateBatchMarks);

// Delete whole batch
router.delete("/:batchId", MANAGE, ctrl.deleteAssessmentBatch);

// Remove one student row
router.delete(
  "/:batchId/student/:studentId",
  MANAGE,
  ctrl.deleteStudentFromBatch
);

module.exports = router;
