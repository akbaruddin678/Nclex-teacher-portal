const ErrorResponse = require("../utils/apiResponse"); // ensure this exports an Error class
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");

const User = require("../models/User");
const Coordinator = require("../models/Coordinator");
const Campus = require("../models/Campus");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Attendance = require("../models/Attendance");
const Assessment = require("../models/Assessment");
const Teacher = require("../models/Teacher"); // ⟵ MISSING BEFORE (now added)

// helper: get coordinator + campus id
async function getCoordinatorAndCampusId(userId) {
  const coordinator = await Coordinator.findOne({ user: userId }).populate(
    "campus",
    "_id name"
  );
  if (!coordinator || !coordinator.campus) {
    throw new ErrorResponse("Coordinator campus not found", 404);
  }
  return { coordinator, campusId: coordinator.campus._id };
}

// @desc Get coordinator profile
// @route GET /api/v1/coordinator/me
exports.getCoordinatorProfile = asyncHandler(async (req, res, next) => {
  const coordinator = await Coordinator.findOne({ user: req.user.id })
    .populate("user", "email")
    .populate("campus", "name location address contactNumber");

  if (!coordinator)
    return next(new ErrorResponse("Coordinator profile not found", 404));

  res.status(200).json({ success: true, data: coordinator });
});

// @desc Get comprehensive campus dashboard data
// @route GET /api/v1/coordinator/dashboard
exports.getCampusDashboard = asyncHandler(async (req, res, next) => {
  const coordinator = await Coordinator.findOne({ user: req.user.id }).populate(
    {
      path: "campus",
      populate: [
        {
          path: "coordinators",
          select: "name contactNumber",
          populate: { path: "user", select: "email" },
        },
        {
          path: "students",
          select: "name email phone",
          options: { limit: 5 },
        },
        {
          path: "courses",
          select: "name code teacher",
          populate: { path: "teacher", select: "name" },
          options: { limit: 5 },
        },
      ],
    }
  );

  if (!coordinator || !coordinator.campus) {
    return next(new ErrorResponse("Coordinator campus not found", 404));
  }

  const campusId = coordinator.campus._id;

  const [studentCount, courseCount] = await Promise.all([
    Student.countDocuments({ campus: campusId }),
    Course.countDocuments({ campus: campusId }),
  ]);

  const courseIds =
    (coordinator.campus.courses || []).map((c) => (c._id ? c._id : c)) || [];
  const attendanceCount = await Attendance.countDocuments({
    course: { $in: courseIds },
  });

  res.status(200).json({
    success: true,
    data: {
      campus: {
        _id: campusId,
        name: coordinator.campus.name,
        location: coordinator.campus.location,
        address: coordinator.campus.address,
        contactNumber: coordinator.campus.contactNumber,
      },
      coordinators: coordinator.campus.coordinators,
      statistics: {
        students: studentCount,
        courses: courseCount,
        attendanceRecords: attendanceCount,
      },
      recentStudents: coordinator.campus.students,
      recentCourses: coordinator.campus.courses,
    },
  });
});

// @desc Update coordinator profile
// @route PUT /api/v1/coordinator/me
exports.updateCoordinatorProfile = asyncHandler(async (req, res, next) => {
  const updates = {
    name: req.body.name,
    contactNumber: req.body.contactNumber,
  };

  const coordinator = await Coordinator.findOneAndUpdate(
    { user: req.user.id },
    updates,
    { new: true, runValidators: true }
  ).populate("user", "email");

  if (!coordinator)
    return next(new ErrorResponse("Coordinator profile not found", 404));

  res.status(200).json({ success: true, data: coordinator });
});

// @desc Get all students in coordinator's campus
// @route GET /api/v1/coordinator/students
exports.getCampusStudents = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  const students = await Student.find({ campus: campusId })
    .select("-__v")
    .populate({ path: "courses", select: "name code" });

  res
    .status(200)
    .json({ success: true, count: students.length, data: students });
});

// @desc Get student details (scoped to campus)
// @route GET /api/v1/coordinator/students/:id
exports.getStudentDetails = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  const student = await Student.findOne({
    _id: req.params.id,
    campus: campusId,
  })
    .populate("courses", "name code")
    .populate("campus", "name");

  if (!student)
    return next(new ErrorResponse("Student not found in your campus", 404));

  res.status(200).json({ success: true, data: student });
});

// @desc Update student (scoped to campus)
// @route PUT /api/v1/coordinator/students/:id
exports.updateStudent = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  let student = await Student.findOne({ _id: req.params.id, campus: campusId });
  if (!student)
    return next(new ErrorResponse("Student not found in your campus", 404));

  const { documentstatus, ...updates } = req.body; // prevent protected field updates

  student = await Student.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: student });
});

// @desc Get all courses in coordinator's campus
// @route GET /api/v1/coordinator/courses
// controllers/coordinatorController.js
exports.getCampusCourses = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  // Get course ids from Campus.courses (if you maintain that array)
  const campusDoc = await Campus.findById(campusId).select("courses").lean();
  const campusCourseIds = campusDoc?.courses || [];

  // Return courses that are either:
  //  A) explicitly tagged with this campus in Course.campus, OR
  //  B) present in Campus.courses array
  const courses = await Course.find({
    $or: [
      { campus: campusId }, // works if you set course.campus
      { _id: { $in: campusCourseIds } }, // works if you only push ids into campus.courses
    ],
  })
    .populate({ path: "teacher", select: "name" })
    .populate({ path: "students", select: "name" })
    .lean();

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

// @desc Get student attendance (scoped)
// @route GET /api/v1/coordinator/attendance/:studentId
exports.getStudentAttendance = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  const student = await Student.findOne({
    _id: req.params.studentId,
    campus: campusId,
  });
  if (!student)
    return next(new ErrorResponse("Student not found in your campus", 404));

  const attendance = await Attendance.find({ student: student._id })
    .populate("course", "name code")
    .populate("markedBy", "name");

  res
    .status(200)
    .json({ success: true, count: attendance.length, data: attendance });
});

// @desc Mark student attendance (scoped)
// @route POST /api/v1/coordinator/attendance
exports.markAttendance = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);
  const { studentId, courseId, status, date } = req.body;

  const student = await Student.findOne({ _id: studentId, campus: campusId });
  if (!student)
    return next(new ErrorResponse("Student not found in your campus", 404));

  const course = await Course.findOne({ _id: courseId, campus: campusId });
  if (!course)
    return next(new ErrorResponse("Course not found in your campus", 404));

  const attendance = await Attendance.create({
    student: studentId,
    course: courseId,
    status,
    date: date || Date.now(),
    markedBy: req.user.id,
  });

  res.status(201).json({ success: true, data: attendance });
});

// @desc Get student assessments (scoped)
// @route GET /api/v1/coordinator/assessments/:studentId
exports.getStudentAssessments = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  const student = await Student.findOne({
    _id: req.params.studentId,
    campus: campusId,
  });
  if (!student)
    return next(new ErrorResponse("Student not found in your campus", 404));

  const assessments = await Assessment.find({ student: req.params.studentId })
    .populate("course", "name code")
    .populate("gradedBy", "name");

  res
    .status(200)
    .json({ success: true, count: assessments.length, data: assessments });
});

// @desc Assign teacher to course (scoped)
// @route POST /api/v1/coordinator/courses/:courseId/assign-teacher/:teacherId
// controllers/coordinatorController.js
// controllers/coordinatorController.js (or wherever this lives)
// @desc Assign teacher to course (scoped) + ensure teacher.campus stores campusId
// @route POST /api/v1/coordinator/courses/:courseId/assign-teacher/:teacherId
exports.assignTeacherToCourse = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);
  const { courseId, teacherId } = req.params;

  const [course, campusDoc, teacher] = await Promise.all([
    Course.findById(courseId).select("_id campus teacher"),
    Campus.findById(campusId).select("_id courses"),
    Teacher.findById(teacherId)
      .populate("user", "campus")
      .select("_id campus user"), // campus is an array in your schema
  ]);

  if (!course) return next(new ErrorResponse("Course not found", 404));
  if (!teacher) return next(new ErrorResponse("Teacher not found", 404));

  // Verify the teacher belongs to this campus:
  const teacherCampusIds = Array.isArray(teacher.campus)
    ? teacher.campus.map(String)
    : [];
  const belongsByTeacherArray = teacherCampusIds.includes(String(campusId));
  const belongsByUserField =
    teacher.user?.campus && String(teacher.user.campus) === String(campusId);

  if (!belongsByTeacherArray && !belongsByUserField) {
    return next(
      new ErrorResponse("Teacher does not belong to your campus", 400)
    );
  }

  // Verify course belongs to campus
  const inCampusByCourseField =
    course.campus && String(course.campus) === String(campusId);
  const inCampusByCampusArray =
    Array.isArray(campusDoc?.courses) &&
    campusDoc.courses.some((id) => String(id) === String(course._id));

  if (!inCampusByCourseField && !inCampusByCampusArray) {
    return next(new ErrorResponse("Course not found in your campus", 404));
  }

  // Prevent no-op
  if (course.teacher && String(course.teacher) === String(teacherId)) {
    return next(
      new ErrorResponse("Teacher is already assigned to this course", 400)
    );
  }

  // Ensure teacher document stores this campus in its campus[] array
  if (!belongsByTeacherArray) {
    await Teacher.updateOne(
      { _id: teacher._id },
      { $addToSet: { campus: campusId } } // <-- this is the key line
    );
  }

  // Assign on the course
  course.teacher = teacher._id;
  await course.save();

  // Ensure campus has this teacher listed (adjust field to 'teachers' if that's your schema)
  await Campus.updateOne(
    { _id: campusId },
    { $addToSet: { teacher: teacher._id } }
  );

  const updatedCourse = await Course.findById(courseId).populate(
    "teacher",
    "name campus"
  );

  res.status(200).json({
    success: true,
    message: "Teacher assigned successfully",
    data: updatedCourse,
  });
});

// @desc Unassign teacher from course (scoped)
// @route DELETE /api/v1/coordinator/courses/:courseId/unassign-teacher
exports.unassignTeacherFromCourse = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);
  const { courseId } = req.params;

  const course = await Course.findById(courseId).select("_id campus teacher");
  if (!course) return next(new ErrorResponse("Course not found", 404));

  // verify campus ownership (same logic as before, or simpler if course.campus is set)
  if (course.campus && String(course.campus) !== String(campusId)) {
    return next(new ErrorResponse("Course not found in your campus", 404));
  }

  const prevTeacherId = course.teacher;
  course.teacher = null;
  await course.save();

  // If there was a teacher, and they now teach no courses in this campus, remove from campus.teacher
  if (prevTeacherId) {
    const stillTeaching = await Course.exists({
      teacher: prevTeacherId,
      ...(course.campus ? { campus: campusId } : {}), // if you have course.campus
    });

    if (!stillTeaching) {
      await Campus.updateOne(
        { _id: campusId },
        { $pull: { teacher: prevTeacherId } }
      );
    }
  }

  res.status(200).json({
    success: true,
    message: "Teacher unassigned successfully",
    data: course,
  });
});

// @desc Register new teacher (creates User + Teacher, scoped to coordinator campus)
// @route POST /api/v1/coordinator/teachers
// @route POST /api/v1/coordinator/teachers
exports.registerTeacher = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);
  const {
    email,
    password,
    name,
    contactNumber,
    subjectSpecialization,
    qualifications,
  } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new ErrorResponse("Email already in use", 400));

  const user = await User.create({
    email,
    password,
    role: "teacher",
    campus: campusId,
    isActive: true,
  });

  const teacher = await Teacher.create({
    user: user._id,
    name,
    contactNumber,
    subjectSpecialization,
    qualifications,
    campus: [campusId], // <-- seed array with this campus
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Teacher registered successfully",
    data: { user: { _id: user._id, email: user.email }, teacher },
  });
});

// @desc Get all teachers in coordinator's campus
// @route GET /api/v1/coordinator/teachers
exports.getTeachers = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  const teachers = await Teacher.find({ campus: campusId }) // matches in array
    .populate("user", "email role isActive campus");

  res
    .status(200)
    .json({ success: true, count: teachers.length, data: teachers });
});

// @desc Get single teacher (scoped)
// @route GET /api/v1/coordinator/teachers/:id
exports.getTeacher = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  const teacher = await Teacher.findById(req.params.id).populate(
    "user",
    "email role isActive campus"
  );

  if (!teacher) return next(new ErrorResponse("Teacher not found", 404));

  const belongs =
    (teacher.campus || []).some((id) => String(id) === String(campusId)) ||
    (teacher.user?.campus && String(teacher.user.campus) === String(campusId));

  if (!belongs) {
    return next(new ErrorResponse("Teacher not in your campus", 403));
  }

  res.status(200).json({ success: true, data: teacher });
});

// @desc Update teacher (scoped)
// @route PUT /api/v1/coordinator/teachers/:id
exports.updateTeacher = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);
  const { name, contactNumber, subjectSpecialization, qualifications } =
    req.body;

  const teacher = await Teacher.findById(req.params.id).populate(
    "user",
    "campus"
  );
  if (!teacher) return next(new ErrorResponse("Teacher not found", 404));
  if (!teacher.user || String(teacher.user.campus) !== String(campusId)) {
    return next(new ErrorResponse("Teacher not in your campus", 403));
  }

  if (name !== undefined) teacher.name = name;
  if (contactNumber !== undefined) teacher.contactNumber = contactNumber;
  if (subjectSpecialization !== undefined)
    teacher.subjectSpecialization = subjectSpecialization;
  if (qualifications !== undefined) teacher.qualifications = qualifications;

  await teacher.save();

  res.status(200).json({
    success: true,
    message: "Teacher updated successfully",
    data: teacher,
  });
});

// @desc Delete teacher + linked user (scoped)
// @route DELETE /api/v1/coordinator/teachers/:id
exports.deleteTeacher = asyncHandler(async (req, res, next) => {
  const { campusId } = await getCoordinatorAndCampusId(req.user.id);

  const teacher = await Teacher.findById(req.params.id).populate(
    "user",
    "campus"
  );
  if (!teacher) return next(new ErrorResponse("Teacher not found", 404));
  if (!teacher.user || String(teacher.user.campus) !== String(campusId)) {
    return next(new ErrorResponse("Teacher not in your campus", 403));
  }

  await User.findByIdAndDelete(teacher.user._id);
  await teacher.deleteOne();

  res
    .status(200)
    .json({ success: true, message: "Teacher and linked User deleted" });
});
