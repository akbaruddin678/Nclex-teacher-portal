const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Assessment = require("../models/Assessment");
const Student = require("../models/Student");
const Course = require("../models/Course");

// @desc    Add assessment marks
// @route   POST /api/v1/assessments
// @access  Private/Teacher
exports.addAssessment = asyncHandler(async (req, res, next) => {
  const { studentId, courseId, type, marks, totalMarks, remarks } = req.body;

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
      new ErrorResponse("Not authorized to add assessment for this course", 401)
    );
  }

  const assessment = await Assessment.create({
    student: studentId,
    course: courseId,
    type,
    marks,
    totalMarks,
    remarks,
    gradedBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: assessment,
  });
});

// @desc    Add bulk assessment marks
// @route   POST /api/v1/assessments/bulk
// @access  Private/Teacher
exports.addBulkAssessments = asyncHandler(async (req, res, next) => {
  const { courseId, type, assessments, totalMarks } = req.body;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  // Check if teacher is assigned to this course
  if (course.teacher.toString() !== req.user.id) {
    return next(
      new ErrorResponse("Not authorized to add assessment for this course", 401)
    );
  }

  // Validate all students exist
  const studentIds = assessments.map((a) => a.studentId);
  const students = await Student.find({ _id: { $in: studentIds } });
  if (students.length !== assessments.length) {
    return next(new ErrorResponse("One or more students not found", 404));
  }

  const assessmentRecords = assessments.map((ass) => ({
    student: ass.studentId,
    course: courseId,
    type,
    marks: ass.marks,
    totalMarks,
    gradedBy: req.user.id,
  }));

  const createdAssessments = await Assessment.insertMany(assessmentRecords);

  res.status(201).json({
    success: true,
    data: createdAssessments,
  });
});

// @desc    Get student assessments
// @route   GET /api/v1/assessments/student/:studentId/course/:courseId
// @access  Private/Teacher,Student
exports.getStudentAssessments = asyncHandler(async (req, res, next) => {
  const { studentId, courseId } = req.params;

  // For students, only allow viewing their own assessments
  if (req.user.role === "student" && req.user.id !== studentId) {
    return next(
      new ErrorResponse("Not authorized to view these assessments", 401)
    );
  }

  // For teachers, check if they teach this course
  if (req.user.role === "teacher") {
    const course = await Course.findById(courseId);
    if (!course || course.teacher.toString() !== req.user.id) {
      return next(
        new ErrorResponse("Not authorized to view these assessments", 401)
      );
    }
  }

  const assessments = await Assessment.find({
    student: studentId,
    course: courseId,
  }).sort({ type: 1 });

  res.status(200).json({
    success: true,
    data: assessments,
  });
});
