// server.js (or app.js)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");

// ---- Ensure uploads directory exists ----
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---- Import routes ----
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const coordinatorRoutes = require("./routes/coordinatorRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const courseRoutes = require("./routes/courseRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const documentRoutes = require("./routes/documentRoutes");
const lessonPlanRoutes = require("./routes/lessonPlanRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

// ---- Connect DB ----
connectDB();

const app = express();

// ---- Security middleware ----
app.use(helmet());

// ---- CORS (Express v5-safe; no "*" paths) ----
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://dnkportal.online",
];

// Allow additional origins via env: CORS_ORIGINS="http://localhost:4173,https://yourdomain.com"
const EXTRA_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOW_ORIGINS = [...new Set([...DEFAULT_ORIGINS, ...EXTRA_ORIGINS])];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow REST clients/no origin (curl, Postman) and whitelisted web origins
      if (!origin || ALLOW_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // if you use cookies; safe even if you only use Bearer tokens
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"],
  })
);

// NOTE: No app.options("*", ...) here. cors() will handle preflight automatically.

// ---- Body parser ----
app.use(express.json({ limit: "1mb" }));

// ---- Static for uploads ----
app.use("/uploads", express.static(uploadsDir));

// ---- Dev logger ----
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ---- Mount routers ----
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/coordinator", coordinatorRoutes);
app.use("/api/v1/teacher", teacherRoutes);
app.use("/api/v1/student", studentRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/assessments", assessmentRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/lesson-plans", lessonPlanRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// ---- Error handler must be last ----
app.use(errorHandler);

module.exports = app;
