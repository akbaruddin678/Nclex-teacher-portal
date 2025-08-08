const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Course = require("../models/Course");
const CourseOutline = require("../models/CourseOutline");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

// @desc    Create a course
// @route   POST /api/v1/courses
// @access  Private/Admin
exports.createCourse = asyncHandler(async (req, res, next) => {
  const {
    name,
    code,
    description,
    creditHours,
    teacherId,
    startDate,
    endDate,
  } = req.body;

  // Check if teacher exists
  if (teacherId) {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return next(new ErrorResponse("Teacher not found", 404));
    }
  }

  const course = await Course.create({
    name,
    code,
    description,
    creditHours,
    teacher: teacherId,
    startDate,
    endDate,
  });

  res.status(201).json({
    success: true,
    data: course,
  });
});

// @desc    Add students to course in bulk
// @route   POST /api/v1/courses/:courseId/students/bulk
// @access  Private/Admin
exports.addBulkStudentsToCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { studentIds } = req.body;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  // Check if all students exist
  const students = await Student.find({ _id: { $in: studentIds } });
  if (students.length !== studentIds.length) {
    return next(new ErrorResponse("One or more students not found", 404));
  }

  // Add students to course (avoid duplicates)
  const existingStudentIds = course.students.map((id) => id.toString());
  const newStudentIds = studentIds.filter(
    (id) => !existingStudentIds.includes(id)
  );

  course.students = [...course.students, ...newStudentIds];
  await course.save();

  res.status(200).json({
    success: true,
    data: course,
  });
});

// @desc    Add weekly outline to course
// @route   POST /api/v1/courses/:courseId/outline
// @access  Private/Teacher
exports.addCourseOutline = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { week, topics, objectives, resources, assignments } = req.body;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse("Course not found", 404));
  }

  // Check if teacher is assigned to this course
  if (course.teacher.toString() !== req.user.id) {
    return next(
      new ErrorResponse("Not authorized to add outline for this course", 401)
    );
  }

  const outline = await CourseOutline.create({
    course: courseId,
    week,
    topics,
    objectives,
    resources,
    assignments,
  });

  res.status(201).json({
    success: true,
    data: outline,
  });
});

// @desc    Get course outlines
// @route   GET /api/v1/courses/:courseId/outline
// @access  Private
exports.getCourseOutlines = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const outlines = await CourseOutline.find({ course: courseId }).sort({
    week: 1,
  });

  res.status(200).json({
    success: true,
    data: outlines,
  });
});
