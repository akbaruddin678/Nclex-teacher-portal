const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware");
const {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacherController");

router.use(protect);

router
  .route("/")
  .post(authorize("admin", "coordinator"), createTeacher)
  .get(authorize("admin", "coordinator"), getTeachers);

router
  .route("/:id")
  .put(authorize("admin", "coordinator"), updateTeacher)
  .delete(authorize("admin", "coordinator"), deleteTeacher);

module.exports = router;
