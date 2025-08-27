const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Teacher = require("../models/Teacher");

/** Resolve teacher doc from logged-in user */
async function getTeacherFromUser(userId) {
  const t = await Teacher.findOne({ user: userId }).select("_id");
  if (!t) throw new ErrorResponse("Teacher profile not found", 404);
  return t;
}

/** helper: course is taught by teacher? (handles array or single) */
function taughtBy(course, teacherId) {
  if (Array.isArray(course.teacher)) {
    return course.teacher.some((id) => String(id) === String(teacherId));
  }
  return course.teacher && String(course.teacher) === String(teacherId);
}

// POST /api/v1/attendance
exports.markAttendance = asyncHandler(async (req, res, next) => {
  const { studentId, courseId, status, date } = req.body;
  const teacher = await getTeacherFromUser(req.user.id);

  const [student, course] = await Promise.all([
    Student.findById(studentId),
    Course.findById(courseId),
  ]);
  if (!student) return next(new ErrorResponse("Student not found", 404));
  if (!course) return next(new ErrorResponse("Course not found", 404));
  if (!taughtBy(course, teacher._id))
    return next(new ErrorResponse("Not authorized for this course", 401));

  const attendance = await Attendance.create({
    student: studentId,
    course: courseId,
    status,
    date: date ? new Date(date) : Date.now(),
    markedBy: teacher._id,
  });

  res.status(201).json({ success: true, data: attendance });
});

// POST /api/v1/attendance/bulk
exports.markBulkAttendance = asyncHandler(async (req, res, next) => {
  const { courseId, attendances = [], date } = req.body;
  const teacher = await getTeacherFromUser(req.user.id);

  const course = await Course.findById(courseId);
  if (!course) return next(new ErrorResponse("Course not found", 404));
  if (!taughtBy(course, teacher._id))
    return next(new ErrorResponse("Not authorized for this course", 401));

  const studentIds = attendances.map((a) => a.studentId);
  const found = await Student.find({ _id: { $in: studentIds } }).select("_id");
  if (found.length !== studentIds.length)
    return next(new ErrorResponse("One or more students not found", 404));

  const when = date ? new Date(date) : new Date(); // end-user selected date

  const docs = attendances.map((a) => ({
    student: a.studentId,
    course: courseId,
    status: a.status, // already mapped from UI to enum by frontend
    date: when,
    markedBy: teacher._id,
  }));

  const created = await Attendance.insertMany(docs);
  res.status(201).json({ success: true, data: created });
});

// GET /api/v1/attendance/course/:courseId?date=YYYY-MM-DD
exports.getCourseAttendance = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const teacher = await getTeacherFromUser(req.user.id);

  const course = await Course.findById(courseId);
  if (!course) return next(new ErrorResponse("Course not found", 404));
  if (!taughtBy(course, teacher._id))
    return next(new ErrorResponse("Not authorized for this course", 401));

  const q = { course: courseId };
  // Optional day filter
  if (req.query.date) {
    const start = new Date(req.query.date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    q.date = { $gte: start, $lt: end };
  }

  const attendance = await Attendance.find(q)
    .populate("student", "name email")
    .sort({ date: -1 });

  res.status(200).json({ success: true, data: attendance });
});
