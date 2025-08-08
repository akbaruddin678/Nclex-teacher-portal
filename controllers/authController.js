const User = require("../models/User");
const Admin = require("../models/Admin");
const Coordinator = require("../models/Coordinator");
const Teacher = require("../models/Teacher");
const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { generateToken } = require("../services/authService");

// @desc    Register admin
// @route   POST /api/v1/auth/admin/register
// @access  Public
exports.registerAdmin = asyncHandler(async (req, res, next) => {
  const { email, password, name, contactNumber } = req.body;

  // Check if admin already exists
  const existingAdmin = await User.findOne({ email, role: "admin" });
  if (existingAdmin) {
    return next(new ErrorResponse("Admin already exists", 400));
  }

  // Create user
  const user = await User.create({
    email,
    password,
    role: "admin",
  });

  // Create admin profile
  const admin = await Admin.create({
    user: user._id,
    name,
    contactNumber,
  });

  // Create token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      admin: {
        id: admin._id,
        name: admin.name,
        contactNumber: admin.contactNumber,
      },
    },
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  console.log("Login attempt with body:", req.body);
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new ErrorResponse("Account is deactivated", 401));
  }

  // Create token
  const token = generateToken(user._id);

  let profile = null;

  // Get profile based on role
  if (user.role === "admin") {
    profile = await Admin.findOne({ user: user._id });
  } else if (user.role === "coordinator") {
    profile = await Coordinator.findOne({ user: user._id });
  } else if (user.role === "teacher") {
    profile = await Teacher.findOne({ user: user._id });
  } else if (user.role === "student") {
    profile = await Student.findOne({ user: user._id });
  }

  res.status(200).json({
    success: true,
    token,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      profile,
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  let profile = null;

  // Get profile based on role
  if (user.role === "admin") {
    profile = await Admin.findOne({ user: user._id });
  } else if (user.role === "coordinator") {
    profile = await Coordinator.findOne({ user: user._id });
  } else if (user.role === "teacher") {
    profile = await Teacher.findOne({ user: user._id });
  } else if (user.role === "student") {
    profile = await Student.findOne({ user: user._id });
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      profile,
    },
  });
});
exports.logout = asyncHandler(async (req, res, next) => {
  // Optionally: You could add token to a blacklist here
  // For now, we'll just send a success response

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});
