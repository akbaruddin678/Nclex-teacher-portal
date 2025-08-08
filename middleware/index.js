const ErrorResponse = require("../utils/apiResponse");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const multer = require("multer");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Assignment validation middleware
exports.validateAssignment = (type) => {
  return (req, res, next) => {
    let isValid = true;
    let message = "";
    let details = {};

    switch (type) {
      case "coordinator":
        if (!req.body.coordinatorId || !req.body.campusId) {
          isValid = false;
          message = "Coordinator ID and Campus ID are required";
          details = { requiredFields: ["coordinatorId", "campusId"] };
        }
        break;
      case "courses":
        if (!req.body.courseIds || !req.body.campusId) {
          isValid = false;
          message = "Course IDs and Campus ID are required";
          details = { requiredFields: ["courseIds", "campusId"] };
        } else if (!Array.isArray(req.body.courseIds)) {
          isValid = false;
          message = "Course IDs must be an array";
          details = { fieldType: { courseIds: "Array" } };
        }
        break;
      case "teachers":
        if (!req.body.teacherId || !req.body.courseIds) {
          isValid = false;
          message = "Teacher ID and Course IDs are required";
          details = { requiredFields: ["teacherId", "courseIds"] };
        } else if (!Array.isArray(req.body.courseIds)) {
          isValid = false;
          message = "Course IDs must be an array";
          details = { fieldType: { courseIds: "Array" } };
        }
        break;
      case "students":
        if (!req.body.studentIds || !req.body.campusId) {
          isValid = false;
          message = "Student IDs and Campus ID are required";
          details = { requiredFields: ["studentIds", "campusId"] };
        } else if (!Array.isArray(req.body.studentIds)) {
          isValid = false;
          message = "Student IDs must be an array";
          details = { fieldType: { studentIds: "Array" } };
        }
        break;
    }

    if (!isValid) {
      return next(new ErrorResponse(message, 400, details));
    }

    next();
  };
};

// File upload middleware
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/pdf" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png"
  ) {
    cb(null, true);
  } else {
    cb(
      new ErrorResponse("Only PDF, JPEG, and PNG files are allowed", 400, {
        allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
      }),
      false
    );
  }
};

exports.upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB
  },
  fileFilter: fileFilter,
});
