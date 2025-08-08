const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Create teacher
// @route   POST /api/v1/coordinator/teachers
// @access  Private/Coordinator
exports.createTeacher = asyncHandler(async (req, res, next) => {
  const {
    email,
    password,
    name,
    contactNumber,
    subjectSpecialization,
    qualifications,
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse("User already exists", 400));
  }

  // Create user
  const user = await User.create({
    email,
    password,
    role: "teacher",
  });

  // Create teacher profile
  const teacher = await Teacher.create({
    user: user._id,
    name,
    contactNumber,
    subjectSpecialization,
    qualifications,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      teacher,
    },
  });
});

// @desc    Create student
// @route   POST /api/v1/coordinator/students
// @access  Private/Coordinator
exports.createStudent = asyncHandler(async (req, res, next) => {
  const {
    email,
    password,
    name,
    cnic,
    phone,
    pncNo,
    passport,
    qualifications,
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse("User already exists", 400));
  }

  // Create user
  const user = await User.create({
    email,
    password,
    role: "student",
  });

  // Create student profile
  const student = await Student.create({
    user: user._id,
    name,
    cnic,
    phone,
    pncNo,
    passport,
    qualifications,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      student,
    },
  });
});
// Get all teachers
exports.getTeachers = asyncHandler(async (req, res, next) => {
  const teachers = await Teacher.find().populate("user", "email role");
  res.status(200).json({ success: true, data: teachers });
});

// Update teacher
exports.updateTeacher = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!teacher) return next(new ErrorResponse("Teacher not found", 404));
  res.status(200).json({ success: true, data: teacher });
});

// Delete teacher
exports.deleteTeacher = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findByIdAndDelete(req.params.id);
  if (!teacher) return next(new ErrorResponse("Teacher not found", 404));
  res.status(200).json({ success: true, message: "Teacher deleted" });
});

// Get all students
exports.getStudents = asyncHandler(async (req, res, next) => {
  const students = await Student.find().populate("user", "email role");
  res.status(200).json({ success: true, data: students });
});

// Update student
exports.updateStudent = asyncHandler(async (req, res, next) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!student) return next(new ErrorResponse("Student not found", 404));
  res.status(200).json({ success: true, data: student });
});

// Delete student
exports.deleteStudent = asyncHandler(async (req, res, next) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return next(new ErrorResponse("Student not found", 404));
  res.status(200).json({ success: true, message: "Student deleted" });
});
