const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const Campus = require("../models/Campus");
const User = require("../models/User");
const Coordinator = require("../models/Coordinator");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Course = require("../models/Course");

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
  const campuses = await Campus.find().populate("createdBy", "name email");
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password, name, contactNumber, campusId } = req.body;

    const campus = await Campus.findById(campusId).session(session);
    if (!campus) throw new ErrorResponse("Campus not found", 404);

    const user = await User.create(
      [{ email, password, role: "coordinator", campus: campusId }],
      { session }
    );
    const coordinator = await Coordinator.create(
      [
        {
          user: user[0]._id,
          name,
          contactNumber,
          campus: campusId,
          createdBy: req.user.id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: coordinator[0] });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
});

const getCoordinators = asyncHandler(async (req, res, next) => {
  const coordinators = await Coordinator.find()
    .populate("user", "email")
    .populate("campus", "name");
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
  )
    .populate("user", "email")
    .populate("campus", "name");
  res.status(200).json({ success: true, data: coordinator });
});

const deleteCoordinator = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const coordinator = await Coordinator.findById(req.params.id).session(
      session
    );
    if (!coordinator) throw new ErrorResponse("Coordinator not found", 404);

    await User.findByIdAndDelete(coordinator.user).session(session);
    await Coordinator.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
});

// Teacher CRUD Operations
const createTeacher = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      email,
      password,
      name,
      contactNumber,
      subjectSpecialization,
      qualifications,
      campusId,
    } = req.body;

    const campus = await Campus.findById(campusId).session(session);
    if (!campus) throw new ErrorResponse("Campus not found", 404);

    const user = await User.create(
      [{ email, password, role: "teacher", campus: campusId }],
      { session }
    );
    const teacher = await Teacher.create(
      [
        {
          user: user[0]._id,
          name,
          contactNumber,
          subjectSpecialization,
          qualifications,
          campus: campusId,
          createdBy: req.user.id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: teacher[0] });
  } catch (err) {
    await handleTransactionError(session, err, next);
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
const createStudent = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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

    const user = await User.create([{ email, password, role: "student" }], {
      session,
    });
    const student = await Student.create(
      [
        {
          user: user[0]._id,
          name,
          cnic,
          phone,
          pncNo,
          passport,
          qualifications,
          createdBy: req.user.id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: student[0] });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
});

const getStudents = asyncHandler(async (req, res, next) => {
  const students = await Student.find()
    .populate("user", "email")
    .populate("campus", "name");
  res.status(200).json({ success: true, data: students });
});

const updateStudent = asyncHandler(async (req, res, next) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("user", "email")
    .populate("campus", "name");
  res.status(200).json({ success: true, data: student });
});

const deleteStudent = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const student = await Student.findById(req.params.id).session(session);
    if (!student) throw new ErrorResponse("Student not found", 404);

    await User.findByIdAndDelete(student.user).session(session);
    await Student.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
});

// Course CRUD Operations
const createCourse = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      code,
      description,
      creditHours,
      teacherId,
      campusId,
      startDate,
      endDate,
    } = req.body;

    const campus = await Campus.findById(campusId).session(session);
    if (!campus) throw new ErrorResponse("Campus not found", 404);

    if (teacherId) {
      const teacher = await Teacher.findById(teacherId).session(session);
      if (!teacher) throw new ErrorResponse("Teacher not found", 404);
    }

    const course = await Course.create(
      [
        {
          name,
          code,
          description,
          creditHours,
          teacher: teacherId,
          campus: campusId,
          startDate,
          endDate,
          createdBy: req.user.id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: course[0] });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
});

const getCourses = asyncHandler(async (req, res, next) => {
  const courses = await Course.find()
    .populate("teacher", "name")
    .populate("campus", "name")
    .populate("students", "name");
  res.status(200).json({ success: true, data: courses });
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

// Assignment Operations
const assignCoordinatorToCampus = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { coordinatorId, campusId } = req.body;

    const coordinator = await Coordinator.findById(coordinatorId).session(
      session
    );
    if (!coordinator) throw new ErrorResponse("Coordinator not found", 404);

    const campus = await Campus.findById(campusId).session(session);
    if (!campus) throw new ErrorResponse("Campus not found", 404);

    coordinator.campus = campusId;
    await coordinator.save({ session });
    await User.findByIdAndUpdate(
      coordinator.user,
      { campus: campusId },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populatedCoordinator = await Coordinator.findById(coordinatorId)
      .populate("user", "email")
      .populate("campus", "name");

    res.status(200).json({ success: true, data: populatedCoordinator });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
});

const assignCoursesToCampus = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courseIds, campusId } = req.body;

    const campus = await Campus.findById(campusId).session(session);
    if (!campus) throw new ErrorResponse("Campus not found", 404);

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

    await Course.updateMany(
      { _id: { $in: courseIds } },
      { campus: campusId },
      { session }
    );
    await session.commitTransaction();
    session.endSession();

    const updatedCourses = await Course.find({ _id: { $in: courseIds } })
      .select("name code campus")
      .populate("campus", "name");

    res.status(200).json({
      success: true,
      data: { campus: campus.name, assignedCourses: updatedCourses },
    });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
});

const assignTeachersToCourses = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { teacherId, courseIds } = req.body;

    const teacher = await Teacher.findById(teacherId).session(session);
    if (!teacher) throw new ErrorResponse("Teacher not found", 404);

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

    await Course.updateMany(
      { _id: { $in: courseIds } },
      { teacher: teacherId },
      { session }
    );
    await session.commitTransaction();
    session.endSession();

    const populatedTeacher = await Teacher.findById(teacherId)
      .populate("user", "email")
      .populate("campus", "name");

    const populatedCourses = await Course.find({
      _id: { $in: courseIds },
    }).select("name code");

    res.status(200).json({
      success: true,
      data: { teacher: populatedTeacher, courses: populatedCourses },
    });
  } catch (err) {
    await handleTransactionError(session, err, next);
  }
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
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  createCourse,
  getCourses,
  updateCourse,
  deleteCourse,
  assignCoordinatorToCampus,
  assignCoursesToCampus,
  assignTeachersToCourses,
  assignStudentsToCampusAndCourses,
};
