const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Student = require("../models/Student");

// @desc    Get student profile
// @route   GET /api/v1/student/me
// @access  Private/Student
exports.getStudentProfile = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ user: req.user.id });

  if (!student) {
    return next(new ErrorResponse("Student profile not found", 404));
  }

  res.status(200).json({
    success: true,
    data: student,
  });
});
