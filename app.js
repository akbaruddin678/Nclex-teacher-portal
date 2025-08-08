const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Import all routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const coordinatorRoutes = require("./routes/coordinatorRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const courseRoutes = require("./routes/courseRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const documentRoutes = require("./routes/documentRoutes");

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// File uploads
app.use("/uploads", express.static(uploadsDir));

// Security middleware
app.use(helmet());
app.use(cors());

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Mount routers
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/coordinator", coordinatorRoutes);
app.use("/api/v1/teacher", teacherRoutes);
app.use("/api/v1/student", studentRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/assessments", assessmentRoutes);
app.use("/api/v1/documents", documentRoutes);

// Error handler middleware
app.use(errorHandler);

module.exports = app;
