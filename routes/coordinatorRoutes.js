const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware");
const {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
} = require("../controllers/coordinatorController");

router.use(protect);
router.use(authorize("coordinator"));

// Teacher routes
router.route("/teachers").post(createTeacher).get(getTeachers);

router.route("/teachers/:id").put(updateTeacher).delete(deleteTeacher);

// Student routes
router.route("/students").post(createStudent).get(getStudents);

router.route("/students/:id").put(updateStudent).delete(deleteStudent);

module.exports = router;
