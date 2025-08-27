// controllers/assessmentController.js
const ErrorResponse = require("../utils/apiResponse"); // your error helper
const asyncHandler = require("../utils/asyncHandler");
const Assessment = require("../models/Assessment");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const { Types } = require("mongoose");

/* --------------- helpers --------------- */

const normalizeType = (t = "") => String(t).trim().toLowerCase();
const VALID_TYPES = [
  "quiz",
  "assignment",
  "midterm",
  "final",
  "project",
  "practical",
  "viva",
];

const toIdStr = (val) => {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val._id) return String(val._id);
  try {
    return String(val);
  } catch {
    return null;
  }
};

const courseTaughtBy = (course, teacherId) => {
  const want = String(teacherId);
  if (Array.isArray(course.teacher)) {
    return course.teacher.map(toIdStr).some((id) => id === want);
  }
  return toIdStr(course.teacher) === want;
};

async function getTeacherFromUser(userId) {
  return Teacher.findOne({ user: userId }).select("_id");
}

function requireValidObjectId(id, name = "id") {
  if (!Types.ObjectId.isValid(String(id))) {
    throw new ErrorResponse(`Invalid ${name}: ${id}`, 400);
  }
}

/* --------------- controllers --------------- */

/** Create or update a whole assessment batch (upsert of all rows) */
exports.upsertAssessmentBatch = asyncHandler(async (req, res, next) => {
  const { batchId, courseId, type, title, description, date, totalMarks } =
    req.body;
  let { entries = [] } = req.body;

  console.debug("[assessments] upsertAssessmentBatch payload:", {
    batchId,
    courseId,
    type,
    title,
    entriesCount: Array.isArray(entries) ? entries.length : 0,
  });

  requireValidObjectId(courseId, "courseId");

  const userRole = req.user.role; // "admin" | "principal" | "teacher"
  const userId = req.user.id;

  // 1) Course exists?
  const course = await Course.findById(courseId);
  if (!course) return next(new ErrorResponse("Course not found", 404));

  // 2) Role auth for teachers
  let teacherDoc = null;
  if (userRole === "teacher") {
    teacherDoc = await getTeacherFromUser(userId);
    if (!teacherDoc)
      return next(new ErrorResponse("Teacher profile not found", 404));
    if (!courseTaughtBy(course, teacherDoc._id)) {
      return next(new ErrorResponse("Not authorized for this course", 401));
    }
  }

  // 3) Validate meta
  const tNorm = normalizeType(type);
  if (!VALID_TYPES.includes(tNorm)) {
    return next(new ErrorResponse("Invalid assessment type", 400));
  }
  if (!title || !String(title).trim()) {
    return next(new ErrorResponse("Title is required", 400));
  }
  const when = date ? new Date(date) : new Date();
  const total = Number(totalMarks);
  if (!Number.isFinite(total) || total < 1) {
    return next(new ErrorResponse("totalMarks must be a positive number", 400));
  }

  // 4) Make sure we actually have students to write
  //    If entries not provided, try to use the course roster.
  if (!Array.isArray(entries) || entries.length === 0) {
    // try course.roster
    let roster = [];
    if (Array.isArray(course.students) && course.students.length) {
      roster = course.students.map((s) => (s._id ? String(s._id) : String(s)));
    }
    if (roster.length === 0) {
      return next(
        new ErrorResponse(
          "No students provided and course roster is empty — cannot create an assessment batch.",
          400
        )
      );
    }
    entries = roster.map((sid) => ({
      studentId: String(sid),
      marks: 0,
      remarks: "",
    }));
  }

  // 5) Validate student ids format
  const studentIds = Array.from(
    new Set(
      entries
        .map((e) => String(e.studentId || "").trim())
        .filter((id) => id && Types.ObjectId.isValid(id))
    )
  );

  if (studentIds.length === 0) {
    return next(new ErrorResponse("No valid student ids in entries", 400));
  }

  // 6) Ensure students exist
  const found = await Student.find({ _id: { $in: studentIds } }).select("_id");
  if (found.length !== studentIds.length) {
    const foundSet = new Set(found.map((d) => String(d._id)));
    const missing = studentIds.filter((id) => !foundSet.has(id));
    console.warn("[assessments] missing student ids:", missing);
    return next(new ErrorResponse("One or more students not found", 404));
  }

  const batch = batchId || new Types.ObjectId().toString();

  // 7) Build bulk ops (ordered: false for speed; all are upserts)
  const ops = entries.map((e) => {
    const sid = String(e.studentId);
    const marksNum = Math.max(0, Math.min(total, Number(e.marks ?? 0)));
    return {
      updateOne: {
        filter: { batchId: batch, course: courseId, student: sid },
        update: {
          $set: {
            batchId: batch,
            course: courseId,
            type: tNorm,
            title,
            description,
            totalMarks: total,
            date: when,
            marks: Number.isFinite(marksNum) ? marksNum : 0,
            remarks: e.remarks || "",
            ...(teacherDoc ? { gradedBy: teacherDoc._id } : {}),
          },
          $setOnInsert: {
            createdBy: userId,
            createdByRole: userRole,
          },
        },
        upsert: true,
      },
    };
  });

  // 8) Execute write
  const result = ops.length
    ? await Assessment.bulkWrite(ops, { ordered: false })
    : null;
  console.debug("[assessments] bulkWrite result:", result && result.result);

  // 9) Read back the batch
  const docs = await Assessment.find({ batchId: batch, course: courseId })
    .populate("student", "name email phone")
    .sort({ "student.name": 1 });

  if (docs.length === 0) {
    // This should basically never happen with the guards above
    console.error("[assessments] Created batch has 0 rows; failing.");
    return next(
      new ErrorResponse(
        "Failed to create assessment rows — please check the roster and try again.",
        500
      )
    );
  }

  res.status(batchId ? 200 : 201).json({
    success: true,
    data: {
      batchId: batch,
      courseId,
      meta: { type: tNorm, title, description, date: when, totalMarks: total },
      createdByRole: docs[0]?.createdByRole,
      createdCount: docs.length,
      entries: docs.map((d) => ({
        studentId: d.student._id,
        name: d.student.name,
        email: d.student.email,
        phone: d.student.phone,
        marks: d.marks,
        remarks: d.remarks,
      })),
    },
  });
});

/** Update batch meta only (title/type/date/total/description) */
exports.updateBatchMeta = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;
  const { title, description, type, date, totalMarks } = req.body;

  console.debug("[assessments] updateBatchMeta", { batchId });

  const sample = await Assessment.findOne({ batchId });
  if (!sample)
    return next(new ErrorResponse("Assessment batch not found", 404));

  const course = await Course.findById(sample.course);
  if (!course) return next(new ErrorResponse("Course not found", 404));

  if (req.user.role === "teacher") {
    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher || !courseTaughtBy(course, teacher._id))
      return next(new ErrorResponse("Not authorized for this course", 401));
  }

  const upd = {};
  if (title !== undefined) upd.title = title;
  if (description !== undefined) upd.description = description;
  if (totalMarks !== undefined) upd.totalMarks = Number(totalMarks);
  if (date !== undefined) upd.date = new Date(date);
  if (type !== undefined) {
    const tNorm = normalizeType(type);
    if (!VALID_TYPES.includes(tNorm))
      return next(new ErrorResponse("Invalid assessment type", 400));
    upd.type = tNorm;
  }

  await Assessment.updateMany({ batchId }, { $set: upd });

  const docs = await Assessment.find({ batchId })
    .populate("student", "name email phone")
    .sort({ "student.name": 1 });

  res.status(200).json({
    success: true,
    data: {
      batchId,
      courseId: sample.course,
      meta: {
        type: docs[0]?.type,
        title: docs[0]?.title,
        description: docs[0]?.description,
        date: docs[0]?.date,
        totalMarks: docs[0]?.totalMarks,
      },
      createdByRole: docs[0]?.createdByRole,
      entries: docs.map((d) => ({
        studentId: d.student._id,
        name: d.student.name,
        email: d.student.email,
        phone: d.student.phone,
        marks: d.marks,
        remarks: d.remarks,
      })),
    },
  });
});

/** Update marks (bulk) — also upserts missing rows (adds a student into the batch) */
exports.updateBatchMarks = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;
  const { entries = [] } = req.body;

  console.debug("[assessments] updateBatchMarks", {
    batchId,
    count: entries.length,
  });

  const sample = await Assessment.findOne({ batchId });
  if (!sample)
    return next(new ErrorResponse("Assessment batch not found", 404));

  const course = await Course.findById(sample.course);
  if (!course) return next(new ErrorResponse("Course not found", 404));

  let teacherDoc = null;
  if (req.user.role === "teacher") {
    teacherDoc = await getTeacherFromUser(req.user.id);
    if (!teacherDoc || !courseTaughtBy(course, teacherDoc._id))
      return next(new ErrorResponse("Not authorized for this course", 401));
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return next(new ErrorResponse("No entries to update", 400));
  }

  // validate & ensure students exist
  const studentIds = Array.from(
    new Set(
      entries
        .map((e) => String(e.studentId || "").trim())
        .filter((id) => id && Types.ObjectId.isValid(id))
    )
  );
  const found = await Student.find({ _id: { $in: studentIds } }).select("_id");
  if (found.length !== studentIds.length) {
    const foundSet = new Set(found.map((d) => String(d._id)));
    const missing = studentIds.filter((id) => !foundSet.has(id));
    console.warn("[assessments] update marks missing student ids:", missing);
    return next(new ErrorResponse("One or more students not found", 404));
  }

  // upsert marks; if a student wasn't in the batch yet, add them with sample meta
  const ops = entries.map((e) => ({
    updateOne: {
      filter: { batchId, student: e.studentId, course: course._id },
      update: {
        $set: {
          marks: Number.isFinite(Number(e.marks)) ? Number(e.marks) : 0,
          remarks: e.remarks || "",
          ...(teacherDoc ? { gradedBy: teacherDoc._id } : {}),
        },
        $setOnInsert: {
          // inherit meta from sample row
          batchId,
          course: course._id,
          type: sample.type,
          title: sample.title,
          description: sample.description,
          totalMarks: sample.totalMarks,
          date: sample.date,
          createdBy: sample.createdBy,
          createdByRole: sample.createdByRole,
        },
      },
      upsert: true,
    },
  }));

  await Assessment.bulkWrite(ops, { ordered: false });

  const docs = await Assessment.find({ batchId })
    .populate("student", "name email phone")
    .sort({ "student.name": 1 });

  res.status(200).json({
    success: true,
    data: {
      batchId,
      courseId: course._id,
      entries: docs.map((d) => ({
        studentId: d.student._id,
        name: d.student.name,
        email: d.student.email,
        phone: d.student.phone,
        marks: d.marks,
        remarks: d.remarks,
      })),
    },
  });
});

/** List batches for a course */
exports.getCourseAssessmentBatches = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  requireValidObjectId(courseId, "courseId");

  const course = await Course.findById(courseId);
  if (!course) return next(new ErrorResponse("Course not found", 404));

  if (req.user.role === "teacher") {
    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher || !courseTaughtBy(course, teacher._id))
      return next(new ErrorResponse("Not authorized for this course", 401));
  }

  const batches = await Assessment.aggregate([
    {
      $match: { course: Types.ObjectId.createFromHexString(String(courseId)) },
    },
    {
      $group: {
        _id: "$batchId",
        batchId: { $first: "$batchId" },
        type: { $first: "$type" },
        title: { $first: "$title" },
        description: { $first: "$description" },
        totalMarks: { $first: "$totalMarks" },
        date: { $first: "$date" },
        createdByRole: { $first: "$createdByRole" },
        count: { $sum: 1 },
      },
    },
    { $sort: { date: -1 } },
  ]);

  res.status(200).json({ success: true, data: batches });
});

/** Get one batch (meta + entries) */
exports.getAssessmentBatch = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;
  console.debug("[assessments] getAssessmentBatch", { batchId });

  const sample = await Assessment.findOne({ batchId });
  if (!sample)
    return next(new ErrorResponse("Assessment batch not found", 404));

  const course = await Course.findById(sample.course);
  if (!course) return next(new ErrorResponse("Course not found", 404));

  if (req.user.role === "teacher") {
    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher || !courseTaughtBy(course, teacher._id))
      return next(new ErrorResponse("Not authorized for this course", 401));
  }

  const docs = await Assessment.find({ batchId })
    .populate("student", "name email phone")
    .sort({ "student.name": 1 });

  res.status(200).json({
    success: true,
    data: {
      batchId,
      courseId: course._id,
      meta: {
        type: docs[0]?.type,
        title: docs[0]?.title,
        description: docs[0]?.description,
        date: docs[0]?.date,
        totalMarks: docs[0]?.totalMarks,
      },
      createdByRole: docs[0]?.createdByRole,
      entries: docs.map((d) => ({
        studentId: d.student._id,
        name: d.student.name,
        email: d.student.email,
        phone: d.student.phone,
        marks: d.marks,
        remarks: d.remarks,
      })),
    },
  });
});

/** Delete a whole batch */
exports.deleteAssessmentBatch = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;

  const sample = await Assessment.findOne({ batchId });
  if (!sample)
    return next(new ErrorResponse("Assessment batch not found", 404));

  const course = await Course.findById(sample.course);
  if (!course) return next(new ErrorResponse("Course not found", 404));

  if (req.user.role === "teacher") {
    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher || !courseTaughtBy(course, teacher._id))
      return next(new ErrorResponse("Not authorized for this course", 401));
  }

  const delRes = await Assessment.deleteMany({ batchId });
  console.debug("[assessments] deleteAssessmentBatch", {
    batchId,
    deleted: delRes.deletedCount,
  });

  res.status(200).json({ success: true, message: "Assessment deleted" });
});

/** Remove one student from a batch */
exports.deleteStudentFromBatch = asyncHandler(async (req, res, next) => {
  const { batchId, studentId } = req.params;

  const sample = await Assessment.findOne({ batchId, student: studentId });
  if (!sample) return next(new ErrorResponse("Row not found", 404));

  const course = await Course.findById(sample.course);
  if (!course) return next(new ErrorResponse("Course not found", 404));

  if (req.user.role === "teacher") {
    const teacher = await getTeacherFromUser(req.user.id);
    if (!teacher || !courseTaughtBy(course, teacher._id))
      return next(new ErrorResponse("Not authorized for this course", 401));
  }

  await Assessment.deleteOne({ batchId, student: studentId });
  res.status(200).json({ success: true, message: "Student removed" });
});
