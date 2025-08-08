const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Teacher = require("../models/Teacher");
const User = require("../models/User");

// Teacher CRUD
exports.createTeacher = asyncHandler(async (req, res, next) => {
  const {
    email,
    password,
    name,
    contactNumber,
    subjectSpecialization,
    qualifications,
    campusId,
  } = req.body;

  const user = await User.create({
    email,
    password,
    role: "teacher",
    campus: campusId,
  });

  const teacher = await Teacher.create({
    user: user._id,
    name,
    contactNumber,
    subjectSpecialization,
    qualifications,
    campus: campusId,
    createdBy: req.user.id,
  });

  res.status(201).json({ success: true, data: teacher });
});

exports.getTeachers = asyncHandler(async (req, res, next) => {
  const teachers = await Teacher.find().populate("campus", "name");
  res.status(200).json({ success: true, data: teachers });
});

exports.updateTeacher = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, data: teacher });
});

exports.deleteTeacher = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id);
  await User.findByIdAndDelete(teacher.user);
  await teacher.remove();
  res.status(200).json({ success: true, data: {} });
});
