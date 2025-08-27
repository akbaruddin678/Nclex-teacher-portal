const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware");
const teacherController = require("../controllers/teacherController");

// All teacher self endpoints require auth + teacher role
router.use(protect);
router.use(authorize("teacher")); // Ensure that the user is a teacher

// Route to get current teacher profile
router.get("/me", teacherController.getMyProfile);

// Route to get consolidated teacher dashboard (courses, students, campus)
router.get("/dashboard", teacherController.getTeacherDashboard);

// Route to get courses taught by the teacher
router.get("/courses", teacherController.getTeacherCourses);

// Route to get all students in the teacher's campus
router.get("/students", teacherController.getTeacherStudents);

module.exports = router;
