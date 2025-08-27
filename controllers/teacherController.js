const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/apiResponse");

const Teacher = require("../models/Teacher");
const Campus = require("../models/Campus");
const Course = require("../models/Course");
const Student = require("../models/Student");
const User = require("../models/User");

/**
 * Helper function to get the teacher and their campus details
 * @param {Object} req - The request object containing the user details
 * @returns {Object} - Teacher and campus details
 */
async function getTeacherAndCampuses(req) {
  // Prefer explicit :teacherId; otherwise resolve by current user
  const teacherDoc = req.params.teacherId
    ? await Teacher.findById(req.params.teacherId)
        .populate("user", "campus")
        .populate("campus", "name location address contactNumber")
    : await Teacher.findOne({ user: req.user.id })
        .populate("user", "campus")
        .populate("campus", "name location address contactNumber");

  if (!teacherDoc) throw new ErrorResponse("Teacher profile not found", 404);

  // Teacher.campus is an array; also consider User.campus as a fallback
  const idsFromTeacher = Array.isArray(teacherDoc.campus)
    ? teacherDoc.campus.map((c) => String(c._id || c))
    : [];
  const idFromUser = teacherDoc.user?.campus
    ? String(teacherDoc.user.campus)
    : null;

  const campusIds = Array.from(
    new Set([...idsFromTeacher, idFromUser].filter(Boolean))
  );

  // If campuses were populated above, we already have the docs; otherwise fetch them
  const campuses =
    Array.isArray(teacherDoc.campus) &&
    teacherDoc.campus.length &&
    teacherDoc.campus[0]?.name
      ? teacherDoc.campus
      : campusIds.length
      ? await Campus.find({ _id: { $in: campusIds } }).select(
          "name location address contactNumber"
        )
      : [];

  return { teacher: teacherDoc, campusIds, campuses };
}
/**
 * @desc Get Teacher Dashboard (by teacher id or logged-in user), with one selected campus
 * @route GET /api/v1/teacher/dashboard
 *        GET /api/v1/teacher/:teacherId/dashboard  (if you add this route)
 */
exports.getTeacherDashboard = asyncHandler(async (req, res) => {
  const { teacher, campusIds, campuses } = await getTeacherAndCampuses(req);

  if (campusIds.length === 0) {
    throw new ErrorResponse("Teacher has no campus assigned", 404);
  }

  // Optional: choose campus via query; else first one
  const selectedCampusId = req.query.campusId || campusIds[0];

  const campus = await Campus.findById(selectedCampusId)
    .populate({
      path: "students",
      select: "name email phone city courses",
      populate: { path: "courses", select: "name code" },
    })
    .select("name location address contactNumber");

  if (!campus) throw new ErrorResponse("Campus not found", 404);

  // Course.teacher is an array -> this query matches array elements
  const courses = await Course.find({ teacher: teacher._id })
    .populate("students", "name email")
    .select("name code");

  res.status(200).json({
    success: true,
    data: {
      teacher,
      campus, // the selected campus
      campuses, // all campuses the teacher belongs to (array)
      students: campus.students,
      courses,
    },
  });
});

/**
 * @desc Get Teacher's Courses
 * @route GET /api/v1/teacher/courses
 * @access Protected (Teacher)
 */
exports.getTeacherCourses = asyncHandler(async (req, res) => {
  const { teacher } = await getTeacherAndCampus(req);

  // Get courses assigned to the teacher
  const courses = await Course.find({
    teacher: teacher._id,
  }).populate("students", "name email");

  res.status(200).json({
    success: true,
    data: courses,
  });
});

/**
 * @desc Get Students in Teacher's Campus
 * @route GET /api/v1/teacher/students
 * @access Protected (Teacher)
 */
exports.getTeacherStudents = asyncHandler(async (req, res) => {
  const { campusId } = await getTeacherAndCampus(req);

  // Get all students in the teacher's campus
  const students = await Student.find({ campus: campusId })
    .select("name email phone city courses")
    .populate("courses", "name code");

  res.status(200).json({
    success: true,
    data: students,
  });
});

/**
 * @desc Get Campus Details
 * @route GET /api/v1/campus/:campusId
 * @access Protected (Admin/Coordinator)
 */
exports.getCampusDetails = asyncHandler(async (req, res) => {
  const campusId = req.params.campusId;

  // Get campus details
  const campus = await Campus.findById(campusId)
    .populate("coordinators", "name contactNumber")
    .populate("students", "name email")
    .populate("courses", "name code")
    .populate("teacher", "name contactNumber");

  if (!campus) {
    throw new ErrorResponse("Campus not found", 404);
  }

  res.status(200).json({
    success: true,
    data: campus,
  });
});

/**
 * @desc Get All Students in a Specific Campus
 * @route GET /api/v1/campus/:campusId/students
 * @access Protected (Admin/Coordinator)
 */
exports.getCampusStudents = asyncHandler(async (req, res) => {
  const campusId = req.params.campusId;

  // Get all students in a specific campus
  const students = await Student.find({ campus: campusId })
    .populate("courses", "name code")
    .select("name email phone city courses");

  res.status(200).json({
    success: true,
    data: students,
  });
});

/**
 * @desc Get All Courses in a Specific Campus
 * @route GET /api/v1/campus/:campusId/courses
 * @access Protected (Admin/Coordinator)
 */
exports.getCampusCourses = asyncHandler(async (req, res) => {
  const campusId = req.params.campusId;

  // Get all courses in a specific campus
  const courses = await Course.find({ campus: campusId })
    .populate("teacher", "name")
    .select("name code");

  res.status(200).json({
    success: true,
    data: courses,
  });
});

/**
 * @desc Get Teacher Profile
 * @route GET /api/v1/teacher/me
 * @access Protected (Teacher)
 */
exports.getMyProfile = asyncHandler(async (req, res) => {
  const { teacher, campusId } = await getTeacherAndCampus(req);

  res.status(200).json({
    success: true,
    data: { teacher, campus: teacher.campus },
  });
});
