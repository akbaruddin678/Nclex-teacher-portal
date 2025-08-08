const express = require("express");
const router = express.Router();
const { protect, authorize, validateAssignment } = require("../middleware");
const adminController = require("../controllers/adminController");

// // Apply middleware to all routes
router.use(protect);
router.use(authorize("admin"));

// Campus routes
router
  .route("/campuses")
  .post(adminController.createCampus)
  .get(adminController.getCampuses);

router
  .route("/campuses/:id")
  .put(adminController.updateCampus)
  .delete(adminController.deleteCampus);

// Coordinator routes
router
  .route("/coordinators")
  .post(adminController.createCoordinator)
  .get(adminController.getCoordinators);

router
  .route("/coordinators/:id")
  .put(adminController.updateCoordinator)
  .delete(adminController.deleteCoordinator);

// Teacher routes
router
  .route("/teachers")
  .post(adminController.createTeacher)
  .get(adminController.getTeachers);

router
  .route("/teachers/:id")
  .put(adminController.updateTeacher)
  .delete(adminController.deleteTeacher);

// Student routes
router
  .route("/students")
  .post(adminController.createStudent)
  .get(adminController.getStudents);

router
  .route("/students/:id")
  .put(adminController.updateStudent)
  .delete(adminController.deleteStudent);

// Course routes
router
  .route("/courses")
  .post(adminController.createCourse)
  .get(adminController.getCourses);

router
  .route("/courses/:id")
  .put(adminController.updateCourse)
  .delete(adminController.deleteCourse);

// Assignment routes
router.post(
  "/assign/coordinator",
  validateAssignment("coordinator"),
  adminController.assignCoordinatorToCampus
);

router.post(
  "/assign/courses",
  validateAssignment("courses"),
  adminController.assignCoursesToCampus
);

router.post(
  "/assign/teachers",
  validateAssignment("teachers"),
  adminController.assignTeachersToCourses
);

router.post(
  "/assign/students",
  validateAssignment("students"),
  adminController.assignStudentsToCampusAndCourses
);

module.exports = router;
