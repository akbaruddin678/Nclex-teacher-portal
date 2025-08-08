const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Course = require("../models/Course");

// @desc    Mark attendance
// @route   POST /api/v1/attendance
// @access  Private/Teacher
exports.markAttendance = asyncHandler(async (req, res, next) => {
  const { studentId, courseId, status, session } = req.body;

  // Check if student exists
  const student = await Student.findById(studentId);
  if (!student) {
    return next(new ErrorResponse("Student not found", 404));
  }

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  // Check if teacher is assigned to this course
  if (course.teacher.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        "Not authorized to mark attendance for this course",
        401
      )
    );
  }

  const attendance = await Attendance.create({
    student: studentId,
    course: courseId,
    status,
    session,
    markedBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: attendance,
  });
});

// @desc    Mark bulk attendance
// @route   POST /api/v1/attendance/bulk
// @access  Private/Teacher
exports.markBulkAttendance = asyncHandler(async (req, res, next) => {
  const { courseId, attendances, session } = req.body;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  // Check if teacher is assigned to this course
  if (course.teacher.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        "Not authorized to mark attendance for this course",
        401
      )
    );
  }

  // Validate all students exist
  const studentIds = attendances.map((a) => a.studentId);
  const students = await Student.find({ _id: { $in: studentIds } });
  if (students.length !== attendances.length) {
    return next(new ErrorResponse("One or more students not found", 404));
  }

  const attendanceRecords = attendances.map((att) => ({
    student: att.studentId,
    course: courseId,
    status: att.status,
    session,
    markedBy: req.user.id,
  }));

  const createdAttendances = await Attendance.insertMany(attendanceRecords);

  res.status(201).json({
    success: true,
    data: createdAttendances,
  });
});

// @desc    Get attendance by course
// @route   GET /api/v1/attendance/course/:courseId
// @access  Private/Teacher
exports.getCourseAttendance = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  // Check if teacher is assigned to this course
  if (course.teacher.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        "Not authorized to view attendance for this course",
        401
      )
    );
  }

  const attendance = await Attendance.find({ course: courseId })
    .populate("student", "name")
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    data: attendance,
  });
});
