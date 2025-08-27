const express = require("express");
const router = express.Router();
const {
  getCoordinatorProfile,
  updateCoordinatorProfile,
  getCampusStudents,
  getStudentDetails,
  updateStudent,
  getCampusCourses,
  getStudentAttendance,
  markAttendance,
  getStudentAssessments,
  getCampusDashboard,
  assignTeacherToCourse,
  unassignTeacherFromCourse,
  registerTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/coordinatorController");

const { protect, authorize } = require("../middleware");

// Apply auth for all coordinator routes once
router.use(protect);
router.use(authorize("coordinator"));

// Coordinator profile
router.route("/me").get(getCoordinatorProfile).put(updateCoordinatorProfile);

// Dashboard
router.route("/dashboard").get(getCampusDashboard);

// Students
router.route("/students").get(getCampusStudents);
router.route("/students/:id").get(getStudentDetails).put(updateStudent);

// Courses
router.route("/courses").get(getCampusCourses);
router
  .route("/courses/:courseId/assign-teacher/:teacherId")
  .post(assignTeacherToCourse);
router
  .route("/courses/:courseId/unassign-teacher")
  .delete(unassignTeacherFromCourse);

// Attendance
router.route("/attendance/:studentId").get(getStudentAttendance);
router.route("/attendance").post(markAttendance);

// Assessments
router.route("/assessments/:studentId").get(getStudentAssessments);

// Teachers (scoped under /teachers, not router root)
router.route("/teachers").post(registerTeacher).get(getTeachers);
router
  .route("/teachers/:id")
  .get(getTeacher)
  .put(updateTeacher)
  .delete(deleteTeacher);

module.exports = router;
