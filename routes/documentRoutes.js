const express = require("express");
const router = express.Router();
const { protect, authorize, upload } = require("../middleware");
const {
  uploadDocument,
  verifyDocument,
  getStudentDocuments,
} = require("../controllers/documentController");

// Apply middleware
router.use(protect);

// Student routes
router.post("/", authorize("student"), upload.single("file"), uploadDocument);

// Admin routes
router.put("/:documentId/verify", authorize("admin"), verifyDocument);

// Shared routes
router.get(
  "/student/:studentId",
  authorize("admin", "student"),
  getStudentDocuments
);

module.exports = router;
