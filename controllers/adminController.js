const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const Campus = require("../models/Campus");
const User = require("../models/User");
const Coordinator = require("../models/Coordinator");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Assessment = require("../models/Assessment");
const Attendance = require("../models/Attendance");
const Notification = require("../models/Notification");

// Helper function to handle transaction errors
const handleTransactionError = async (session, error, next) => {
  await session.abortTransaction();
  session.endSession();
  return next(error);
};

// Campus CRUD Operations
const createCampus = asyncHandler(async (req, res, next) => {
  const campus = await Campus.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, data: campus });
});

const getCampuses = asyncHandler(async (req, res, next) => {
  const campuses = await Campus.find()
    .populate("createdBy", "name email")
    .populate({
      path: "coordinators",
      select: "name contactNumber",
      populate: {
        path: "user",
        select: "email",
      },
    });
  res.status(200).json({ success: true, data: campuses });
});

const updateCampus = asyncHandler(async (req, res, next) => {
  const campus = await Campus.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, data: campus });
});

const deleteCampus = asyncHandler(async (req, res, next) => {
  await Campus.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, data: {} });
});

// Coordinator CRUD Operations
const createCoordinator = asyncHandler(async (req, res, next) => {
  try {
    const { email, password, name, contactNumber } = req.body;

    const user = await User.create({
      email,
      password,
      role: "coordinator",
    });

    // Create coordinator
    const coordinator = await Coordinator.create({
      user: user._id,
      name,
      contactNumber,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: coordinator });
  } catch (err) {
    // Cleanup if something fails
    if (user) await User.findByIdAndDelete(user._id);
    if (coordinator) await Coordinator.findByIdAndDelete(coordinator._id);

    next(err);
  }
});
const getCoordinators = asyncHandler(async (req, res, next) => {
  const coordinators = await Coordinator.find()
    .populate("user", "email")
    .populate("campus", "name");
  console.log(coordinators);
  res.status(200).json({ success: true, data: coordinators });
});

const updateCoordinator = asyncHandler(async (req, res, next) => {
  const coordinator = await Coordinator.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  ).populate("user", "email");
  // .populate("campus", "name");
  res.status(200).json({ success: true, data: coordinator });
});

const deleteCoordinator = asyncHandler(async (req, res, next) => {
  try {
    const coordinator = await Coordinator.findById(req.params.id);
    if (!coordinator) {
      throw new ErrorResponse("Coordinator not found", 404);
    }

    // Remove coordinator from campus's coordinators array
    await Campus.findByIdAndUpdate(coordinator.campus, {
      $pull: { coordinators: coordinator._id },
    });

    // Delete user and coordinator
    await User.findByIdAndDelete(coordinator.user);
    await Coordinator.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
});
// Teacher CRUD Operations
const createTeacher = asyncHandler(async (req, res, next) => {
  try {
    const {
      email,
      password,
      name,
      contactNumber,
      subjectSpecialization,
      qualifications,
    } = req.body;

    const user = await User.create({ email, password, role: "teacher" });

    const teacher = await Teacher.create({
      user: user._id,
      name,
      contactNumber,
      subjectSpecialization,
      qualifications,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: teacher });
  } catch (err) {
    next(err);
  }
});

const getTeachers = asyncHandler(async (req, res, next) => {
  const teachers = await Teacher.find()
    .populate("user", "email")
    .populate("campus", "name");
  res.status(200).json({ success: true, data: teachers });
});

const updateTeacher = asyncHandler(async (req, res, next) => {
  const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("user", "email")
    .populate("campus", "name");
  res.status(200).json({ success: true, data: teacher });
});

const deleteTeacher = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const teacher = await Teacher.findById(req.params.id).session(session);
    if (!teacher) throw new ErrorResponse("Teacher not found", 404);

    await User.findByIdAndDelete(teacher.user).session(session);
    await Teacher.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
});

// Student CRUD Operations
const getStudents = asyncHandler(async (req, res) => {
  const students = await Student.find();
  // console.log(students);

  res.status(200).json({ success: true, data: students });
});

const createStudent = asyncHandler(async (req, res) => {
  const { email, name, cnic, phone, city, pncNo, passport, qualifications } =
    req.body;
  // console.log(req.body);
  // // Create user first
  // const user = await User.create({ email, password, role: "student" });

  // Create student
  const student = await Student.create({
    name,
    cnic,
    email,
    phone,
    city,
    pncNo,
    passport,
    qualifications,
    createdBy: req.user.id,
  });

  res.status(201).json({ success: true, data: student });
});

const updateStudent = asyncHandler(async (req, res) => {
  const { name, cnic, phone, city, pncNo, passport, qualifications, courses } =
    req.body;

  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { name, cnic, phone, city, pncNo, passport, qualifications, courses },
    { new: true, runValidators: true }
  );

  if (!student) {
    throw new ErrorResponse("Student not found", 404);
  }

  res.status(200).json({ success: true, data: student });
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    return res.status(404).json({ success: false, error: "Student not found" });
  }
  await student.deleteOne();
  res.status(200).json({ success: true, data: {} });
});

const createCourse = asyncHandler(async (req, res, next) => {
  try {
    // Start with only the required field
    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: "Course name is required",
      });
    }

    // Build course data only with provided fields
    const courseData = {
      name: req.body.name,
    };

    // Add optional fields if provided
    const optionalFields = [
      "code",
      "description",
      "creditHours",
      "teacher",
      "campus",
      "startDate",
      "endDate",
    ];

    optionalFields.forEach((field) => {
      if (
        req.body[field] !== undefined &&
        req.body[field] !== null &&
        req.body[field] !== ""
      ) {
        courseData[field] = req.body[field];
      }
    });

    courseData.createdBy = req.user?.id;

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (err) {
    next(err);
  }
});

const getCourses = asyncHandler(async (req, res, next) => {
  try {
    const courses = await Course.find()
      .populate("teacher", "name")
      .populate({
        path: "campus",
        select: "name",
        options: { strictPopulate: false }, // Add this option
      })
      .populate("students", "name");

    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
});

const updateCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("teacher", "name")
    .populate("campus", "name")
    .populate("students", "name");
  res.status(200).json({ success: true, data: course });
});

const deleteCourse = asyncHandler(async (req, res, next) => {
  await Course.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, data: {} });
});

const assignCoordinatorToCampus = asyncHandler(async (req, res, next) => {
  const { coordinatorId, campusId } = req.body;

  // Find the campus and coordinator
  const campus = await Campus.findById(campusId);
  if (!campus) {
    throw new ErrorResponse("Campus not found", 404);
  }

  const coordinator = await Coordinator.findById(coordinatorId);
  if (!coordinator) {
    throw new ErrorResponse("Coordinator not found", 404);
  }

  // Assign coordinator to campus
  campus.coordinators.push(coordinatorId);
  await campus.save();

  // Update the coordinator's campus reference
  coordinator.campus = campusId;
  await coordinator.save();

  res.status(200).json({
    success: true,
    data: {
      campus: campus.name,
      coordinator: coordinator.name,
    },
  });
});
const removeCoordinatorFromCampus = asyncHandler(async (req, res, next) => {
  const { coordinatorId, campusId } = req.body;

  // Find the campus and coordinator
  const campus = await Campus.findById(campusId);
  if (!campus) {
    throw new ErrorResponse("Campus not found", 404);
  }

  const coordinator = await Coordinator.findById(coordinatorId);
  if (!coordinator) {
    throw new ErrorResponse("Coordinator not found", 404);
  }

  // Remove coordinator from campus
  campus.coordinators.pull(coordinatorId);
  await campus.save();

  // Remove the campus reference from the coordinator
  coordinator.campus = null;
  await coordinator.save();

  res.status(200).json({
    success: true,
    message: `Coordinator ${coordinator.name} removed from campus ${campus.name}`,
  });
});
const getUnassignedCoordinators = asyncHandler(async (req, res, next) => {
  // Fetch coordinators not assigned to any campus
  const coordinators = await Coordinator.find({ campus: { $exists: false } });

  res.status(200).json({
    success: true,
    data: coordinators,
  });
});

const assignStudentsToCampusAndCourses = asyncHandler(
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { studentIds, campusId, courseIds } = req.body;

      const campus = await Campus.findById(campusId).session(session);
      if (!campus) throw new ErrorResponse("Campus not found", 404);

      const students = await Student.find({ _id: { $in: studentIds } }).session(
        session
      );
      if (students.length !== studentIds.length) {
        const missingIds = studentIds.filter(
          (id) => !students.some((s) => s._id.toString() === id)
        );
        throw new ErrorResponse("One or more students not found", 404, {
          missingStudentIds: missingIds,
        });
      }

      await Student.updateMany(
        { _id: { $in: studentIds } },
        { campus: campusId },
        { session }
      );
      await User.updateMany(
        { _id: { $in: students.map((s) => s.user) } },
        { campus: campusId },
        { session }
      );

      if (courseIds && courseIds.length > 0) {
        const courses = await Course.find({ _id: { $in: courseIds } }).session(
          session
        );
        if (courses.length !== courseIds.length) {
          const missingIds = courseIds.filter(
            (id) => !courses.some((c) => c._id.toString() === id)
          );
          throw new ErrorResponse("One or more courses not found", 404, {
            missingCourseIds: missingIds,
          });
        }

        await Promise.all(
          courses.map(async (course) => {
            const existingStudentIds = course.students.map((id) =>
              id.toString()
            );
            const newStudentIds = studentIds.filter(
              (id) => !existingStudentIds.includes(id)
            );
            course.students = [...course.students, ...newStudentIds];
            await course.save({ session });
          })
        );
      }

      await session.commitTransaction();
      session.endSession();

      const updatedStudents = await Student.find({ _id: { $in: studentIds } })
        .select("name cnic campus")
        .populate("campus", "name");

      const result = { campus: campus.name, assignedStudents: updatedStudents };

      if (courseIds && courseIds.length > 0) {
        const updatedCourses = await Course.find({ _id: { $in: courseIds } })
          .select("name code students")
          .populate("students", "name");
        result.assignedCourses = updatedCourses;
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      await handleTransactionError(session, err, next);
    }
  }
);

// Add these methods to your adminController.js

// Get students by city with pagination
const getStudentsByCity = asyncHandler(async (req, res) => {
  const { city, page = 1, limit = 10, campusId } = req.query;

  // Validate campusId if provided
  if (campusId && !mongoose.Types.ObjectId.isValid(campusId)) {
    throw new ErrorResponse("Invalid campus ID", 400);
  }

  // Build query - students from this city NOT assigned to this campus
  const query = { city };
  if (campusId) {
    query.$or = [
      { campus: { $ne: campusId } }, // Not assigned to this campus
      { campus: { $exists: false } }, // Or not assigned to any campus
    ];
  }

  const students = await Student.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

  const count = await Student.countDocuments(query);

  res.status(200).json({
    success: true,
    data: students,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  });
});

// Assign students to campus
const assignStudentsToCampus = asyncHandler(async (req, res, next) => {
  try {
    const { studentIds, campusId } = req.body;

    // Validate input
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new ErrorResponse("Please provide valid student IDs", 400);
    }

    // Check if campus exists
    const campus = await Campus.findById(campusId);
    if (!campus) {
      throw new ErrorResponse("Campus not found", 404);
    }

    // Check if all students exist
    const students = await Student.find({ _id: { $in: studentIds } });
    if (students.length !== studentIds.length) {
      const foundIds = students.map((s) => s._id.toString());
      const missingIds = studentIds.filter((id) => !foundIds.includes(id));
      throw new ErrorResponse(
        `Students not found: ${missingIds.join(", ")}`,
        404
      );
    }

    // Update student records with campus reference
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { campus: campusId }
    );

    // Update campus record with new students (avoid duplicates)
    const existingStudentIds = campus.students.map((id) => id.toString());
    const newStudentIds = studentIds.filter(
      (id) => !existingStudentIds.includes(id)
    );

    if (newStudentIds.length > 0) {
      campus.students.push(...newStudentIds);
      await campus.save();
    }

    // Return updated campus data
    const updatedCampus = await Campus.findById(campusId).populate(
      "students",
      "name email"
    );

    res.status(200).json({
      success: true,
      data: {
        campus: updatedCampus,
        assignedStudents: students.map((s) => s.name),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Assign courses to campus
const assignCoursesToCampus = asyncHandler(async (req, res, next) => {
  try {
    const { courseIds, campusId } = req.body;
    console.log("Assigning courses to campus:", courseIds, campusId);
    // Validate input
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      throw new ErrorResponse("Please provide valid course IDs", 400);
    }

    if (!campusId || !mongoose.Types.ObjectId.isValid(campusId)) {
      throw new ErrorResponse("Please provide a valid campus ID", 400);
    }

    // Check if campus exists
    const campus = await Campus.findById(campusId);
    if (!campus) {
      throw new ErrorResponse("Campus not found", 404);
    }

    // Check if all courses exist
    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      const foundIds = courses.map((c) => c._id.toString());
      const missingIds = courseIds.filter((id) => !foundIds.includes(id));
      throw new ErrorResponse(
        `Courses not found: ${missingIds.join(", ")}`,
        404
      );
    }

    // Update course records with campus reference
    await Course.updateMany({ _id: { $in: courseIds } }, { campus: campusId });

    // Update campus with the new courses (avoid duplicates)
    const existingCourseIds = campus.courses.map((id) => id.toString());
    const newCourseIds = courseIds.filter(
      (id) => !existingCourseIds.includes(id)
    );

    if (newCourseIds.length > 0) {
      campus.courses.push(...newCourseIds);
      await campus.save();
    }

    // Return updated data
    const updatedCampus = await Campus.findById(campusId).populate(
      "courses",
      "name code"
    );

    res.status(200).json({
      success: true,
      data: {
        campus: updatedCampus,
        assignedCourses: courses.map((c) => c.name),
        totalAssigned: courseIds.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get unassigned courses with pagination
const getUnassignedCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const courses = await Course.find({ campus: { $exists: false } })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
  console.log("Inside the Course ", courses);
  const count = await Course.countDocuments({ campus: { $exists: false } });

  res.status(200).json({
    success: true,
    data: courses,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  });
});

// Get Marks for a specific student
const getStudentMarks = asyncHandler(async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Get all assessments for the student, populate course and gradedBy teacher
    const assessments = await Assessment.find({ student: studentId })
      .populate("course", "name")
      .populate("gradedBy", "name")
      .exec();

    if (!assessments || assessments.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No marks found for this student" });
    }

    res.status(200).json({
      success: true,
      data: assessments,
    });
  } catch (err) {
    next(err);
  }
});
// Get Attendance for a specific student
const getStudentAttendance = asyncHandler(async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Get all attendance records for the student, populate course and teacher
    const attendanceRecords = await Attendance.find({ student: studentId })
      .populate("course", "name")
      .populate("markedBy", "name")
      .exec();

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found for this student",
      });
    }

    res.status(200).json({
      success: true,
      data: attendanceRecords,
    });
  } catch (err) {
    next(err);
  }
});

const getStudentsByCampus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Check if the campus exists
  const campus = await Campus.findById(id).populate("students");
  if (!campus) {
    return next(new ErrorResponse("Campus not found", 404));
  }

  // Send the populated campus with students
  res.status(200).json({
    success: true,
    data: campus.students,
  });
});

// Create a new notification
const createNotification = asyncHandler(async (req, res, next) => {
  const { recipientType, subject, message, schedule } = req.body;

  // Ensure that the user is authenticated and `req.user.id` is available
  if (!req.user || !req.user.id) {
    return next(new ErrorResponse("User not authenticated", 401));
  }

  // Create notification with the user as the creator
  const notification = await Notification.create({
    recipientType,
    subject,
    message,
    schedule,
    createdBy: req.user.id, // Ensure that createdBy is provided
  });

  res.status(201).json({
    success: true,
    data: notification,
  });
});

// Get all notifications
const getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: notifications,
  });
});

// adminController.js
// adminController.js

const assignTeacherToCourseAndCampus = asyncHandler(async (req, res, next) => {
  const { teacherId, courseIds } = req.body;

  // Validate teacherId and courseIds
  if (!teacherId || !Array.isArray(courseIds) || courseIds.length === 0) {
    return next(
      new ErrorResponse("Teacher ID and course IDs are required", 400)
    );
  }

  const teacherObjectId = new mongoose.Types.ObjectId(teacherId); // Ensure valid ObjectId
  const courseObjectIds = courseIds.map(
    (id) => new mongoose.Types.ObjectId(id)
  ); // Cast to ObjectId

  // Find the teacher
  const teacher = await Teacher.findById(teacherObjectId);
  if (!teacher) {
    return next(new ErrorResponse("Teacher not found", 404));
  }

  // Find the courses and check if they exist
  const courses = await Course.find({ _id: { $in: courseObjectIds } });
  if (courses.length !== courseObjectIds.length) {
    const missingIds = courseIds.filter(
      (id) => !courses.some((course) => course._id.toString() === id)
    );
    return next(
      new ErrorResponse(`Courses not found: ${missingIds.join(", ")}`, 404)
    );
  }

  // Add the teacher to each course
  await Course.updateMany(
    { _id: { $in: courseObjectIds } },
    { $set: { teacher: teacherObjectId } }
  );

  // Ensure teacher is added to campus if not already added
  const campuses = await Campus.find({ courses: { $in: courseObjectIds } });

  campuses.forEach(async (campus) => {
    // Avoid duplicates: Add the teacher to the campus's teacher array if not already present
    if (!campus.teacher.includes(teacherObjectId)) {
      campus.teacher.push(teacherObjectId);
      await campus.save();
    }
  });

  // Update the teacher's campus reference (if needed)
  await Teacher.updateOne(
    { _id: teacherObjectId },
    { $addToSet: { campus: campuses.map((c) => c._id) } }
  );

  // Populate the teacher and course details for response
  const populatedTeacher = await Teacher.findById(teacherObjectId)
    .populate("user", "email")
    .populate("campus", "name");

  const populatedCourses = await Course.find({
    _id: { $in: courseObjectIds },
  }).populate("teacher", "name");

  res.status(200).json({
    success: true,
    data: {
      teacher: populatedTeacher,
      courses: populatedCourses,
    },
  });
});

module.exports = {
  createCampus,
  getCampuses,
  updateCampus,
  deleteCampus,
  createCoordinator,
  getCoordinators,
  updateCoordinator,
  deleteCoordinator,
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  // importStudents,
  createCourse,
  getCourses,
  updateCourse,
  deleteCourse,

  assignCoursesToCampus,
  assignStudentsToCampusAndCourses,
  //

  getUnassignedCourses,
  assignStudentsToCampus,
  getStudentsByCity,

  //Coordinator assignment
  assignCoordinatorToCampus,
  removeCoordinatorFromCampus,
  getUnassignedCoordinators,

  //Student Marks and Attendance
  getStudentMarks,
  getStudentAttendance,
  getStudentsByCampus,

  getNotifications,
  createNotification,

  assignTeacherToCourseAndCampus,
};