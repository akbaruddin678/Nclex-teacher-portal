// controllers/courseOutlines.js
const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const CourseOutline = require("../models/CourseOutline");
// Optional: only if you still link outlines to a Course via :courseId
// const Course = require("../models/Course");

/**
 * @desc    Add a course outline (new JSON structure)
 * @route   POST /api/v1/courses/:courseId/outline   (courseId optional if your schema has 'course')
 *          or    POST /api/v1/course-outlines       (if you mount a standalone route)
 * @access  Private (teacher/admin)
 */
exports.addCourseOutline = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params || {};
  const {
    program_name,
    week_title,
    location,
    days,
    references = [],
  } = req.body;

  // Basic presence checks (Mongoose will also validate)
  if (
    !program_name ||
    !week_title ||
    !location ||
    !Array.isArray(days) ||
    days.length === 0
  ) {
    return next(
      new ErrorResponse(
        "program_name, week_title, location, and non-empty days[] are required.",
        400
      )
    );
  }

  // Validate day/slot shape quickly before hitting DB
  for (const d of days) {
    if (
      !d.day_name ||
      !d.date ||
      !d.unit ||
      !d.instructor ||
      !Array.isArray(d.slots) ||
      d.slots.length === 0
    ) {
      return next(
        new ErrorResponse(
          "Each day requires day_name, date, unit, instructor, and non-empty slots[].",
          400
        )
      );
    }
    for (const s of d.slots) {
      if (!s.time_start || !s.time_end || !s.topic) {
        return next(
          new ErrorResponse(
            "Each slot requires time_start, time_end, and topic.",
            400
          )
        );
      }
    }
  }

  // If you're still associating outlines to a Course, you can optionally verify it:
  // if (courseId) {
  //   const course = await Course.findById(courseId);
  //   if (!course) return next(new ErrorResponse("Course not found", 404));
  // }

  // Prepare payload
  const payload = {
    program_name,
    week_title,
    location,
    days,
    references,
  };

  // If your CourseOutline schema includes a `course` field, attach it:
  if (courseId) payload.course = courseId;

  const outline = await CourseOutline.create(payload);

  res.status(201).json({
    success: true,
    data: outline,
  });
});

/**
 * @desc    Get course outlines (filterable)
 * @route   GET /api/v1/courses/:courseId/outline
 *          or  GET /api/v1/course-outlines?program_name=&week_title=&location=&date=
 * @access  Private
 */
exports.getCourseOutlines = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params || {};
  const { program_name, week_title, location, date } = req.query;

  const filter = {};

  // If outlines are linked to a course, filter by it
  if (courseId) filter.course = courseId;

  if (program_name) filter.program_name = program_name;
  if (week_title) filter.week_title = week_title;
  if (location) filter.location = location;

  // If a specific calendar date is provided, match outlines that have a day on that date
  // (this uses dot notation on the array of subdocs)
  if (date) filter["days.date"] = new Date(date);

  // Newest first by creation; feel free to change
  const outlines = await CourseOutline.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: outlines.length,
    data: outlines,
  });
});
