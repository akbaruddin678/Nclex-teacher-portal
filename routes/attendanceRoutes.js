const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware");
const {
  markAttendance,
  markBulkAttendance,
  getCourseAttendance,
} = require("../controllers/attendanceController");

router.use(protect);
router.use(authorize("teacher"));

router.post("/", markAttendance);
router.post("/bulk", markBulkAttendance);
router.get("/course/:courseId", getCourseAttendance);

module.exports = router;
