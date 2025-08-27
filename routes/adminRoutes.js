const express = require("express");
const router = express.Router();
const { protect, authorize, validateAssignment } = require("../middleware");
const adminController = require("../controllers/adminController");

// Apply middleware to all routes
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



router.post(
  "/assign/courses",
  validateAssignment("courses"),
  adminController.assignCoursesToCampus
);

// adminRouter.js

router.post("/assign/teacher-to-course-and-campus", adminController.assignTeacherToCourseAndCampus);


router.post(
  "/assign/students",
  validateAssignment("students"),
  adminController.assignStudentsToCampusAndCourses
);

// ====== EXTRA ROUTES from controller ======
// Get students by city (query params)
router.get("/students/city", adminController.getStudentsByCity);

// Assign students to campus
router.post("/assign/students-to-campus", adminController.assignStudentsToCampus);

// Assign courses to campus
router.post("/assign/course-to-campus", adminController.assignCoursesToCampus);


// Get unassigned courses
router.get("/courses/unassigned", adminController.getUnassignedCourses);


// Assign coordinator to campus
router.post(
  "/assign/coordinator",
  validateAssignment("coordinator"),
  adminController.assignCoordinatorToCampus
);

// Remove coordinator from campus
router.post(
  "/remove/coordinator-from-campus",
  validateAssignment("coordinator"),
  adminController.removeCoordinatorFromCampus
);

// Get unassigned coordinators
router.get("/coordinators/unassigned", adminController.getUnassignedCoordinators);

router.get("/marks/:studentId", adminController.getStudentMarks);
router.get("/attendance/:studentId", adminController.getStudentAttendance);

router.get("/campuses/:id/students", adminController.getStudentsByCampus);


// Notification routes
router
  .route("/notifications")
  .get(adminController.getNotifications)
  .post(adminController.createNotification);


  
module.exports = router;
