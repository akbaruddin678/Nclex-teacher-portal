const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const LessonPlan = require("../models/CourseOutline");

// @desc    Create a new lesson plan
// @route   POST /api/v1/lesson-plans
exports.createLessonPlan = asyncHandler(async (req, res, next) => {
  const { head, timesSat, timesSun, cells } = req.body;

  // Validate required fields
  if (!head || !timesSat || !timesSun || !cells) {
    return next(new ErrorResponse("Missing required fields", 400));
  }

  // Validate structure
  if (timesSat.length !== 5 || timesSun.length !== 5 || cells.length !== 10) {
    return next(
      new ErrorResponse(
        "Invalid structure: 5 Sat slots, 5 Sun slots, 10 cells required",
        400
      )
    );
  }

  const lessonPlan = await LessonPlan.create({
    createdBy: req.user.id,
    head,
    timesSat,
    timesSun,
    cells: cells.map((cell) => ({ text: cell.text || "" })),
  });

  const populatedPlan = await LessonPlan.findById(lessonPlan._id).populate(
    "createdBy",
    "email name"
  );

  res.status(201).json({
    success: true,
    message: "Lesson plan created successfully",
    data: populatedPlan,
  });
});

// @desc    Get all lesson plans (creator's only)
// @route   GET /api/v1/lesson-plans
// @desc    Get all lesson plans (admin or teacher - all users)
// @route   GET /api/v1/lesson-plans
exports.getLessonPlans = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { isActive: true };

  const [lessonPlans, total] = await Promise.all([
    LessonPlan.find(filter)
      .populate("createdBy", "email name")
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(limit),
    LessonPlan.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: lessonPlans.length,
    total,
    pagination: { page, pages: Math.ceil(total / limit), limit },
    data: lessonPlans,
  });
});

// @desc    Get single lesson plan (creator's only)
// @route   GET /api/v1/lesson-plans/:id
exports.getLessonPlan = asyncHandler(async (req, res, next) => {
  const lessonPlan = await LessonPlan.findOne({
    _id: req.params.id,
    createdBy: req.user.id,
    isActive: true,
  }).populate("createdBy", "email name");

  if (!lessonPlan) {
    return next(new ErrorResponse("Lesson plan not found", 404));
  }

  res.status(200).json({ success: true, data: lessonPlan });
});

// @desc    Update lesson plan (creator's only)
// @route   PUT /api/v1/lesson-plans/:id
exports.updateLessonPlan = asyncHandler(async (req, res, next) => {
  const { head, timesSat, timesSun, cells } = req.body;

  let lessonPlan = await LessonPlan.findOne({
    _id: req.params.id,
    createdBy: req.user.id,
    isActive: true,
  });

  if (!lessonPlan) {
    return next(new ErrorResponse("Lesson plan not found", 404));
  }

  // Update fields if provided
  if (head) lessonPlan.head = { ...lessonPlan.head, ...head };
  if (timesSat) {
    if (timesSat.length !== 5)
      return next(
        new ErrorResponse("Saturday must have exactly 5 time slots", 400)
      );
    lessonPlan.timesSat = timesSat;
  }
  if (timesSun) {
    if (timesSun.length !== 5)
      return next(
        new ErrorResponse("Sunday must have exactly 5 time slots", 400)
      );
    lessonPlan.timesSun = timesSun;
  }
  if (cells) {
    if (cells.length !== 10)
      return next(new ErrorResponse("Must have exactly 10 topic cells", 400));
    lessonPlan.cells = cells.map((cell) => ({ text: cell.text || "" }));
  }

  lessonPlan.updatedAt = new Date();
  await lessonPlan.save();

  const updatedPlan = await LessonPlan.findById(lessonPlan._id).populate(
    "createdBy",
    "email name"
  );

  res.status(200).json({
    success: true,
    message: "Lesson plan updated successfully",
    data: updatedPlan,
  });
});

// @desc    Delete lesson plan (soft delete, creator's only)
// @route   DELETE /api/v1/lesson-plans/:id
exports.deleteLessonPlan = asyncHandler(async (req, res, next) => {
  const lessonPlan = await LessonPlan.findOne({
    _id: req.params.id,
    createdBy: req.user.id,
    isActive: true,
  });

  if (!lessonPlan) {
    return next(new ErrorResponse("Lesson plan not found", 404));
  }

  lessonPlan.isActive = false;
  await lessonPlan.save();

  res.status(200).json({
    success: true,
    message: "Lesson plan deleted successfully",
  });
});

// @desc    Duplicate lesson plan
// @route   POST /api/v1/lesson-plans/:id/duplicate
exports.duplicateLessonPlan = asyncHandler(async (req, res, next) => {
  const originalPlan = await LessonPlan.findOne({
    _id: req.params.id,
    createdBy: req.user.id,
    isActive: true,
  });

  if (!originalPlan) {
    return next(new ErrorResponse("Lesson plan not found", 404));
  }

  const newPlan = await LessonPlan.create({
    createdBy: req.user.id,
    head: {
      ...originalPlan.head,
      bannerTitle: `${originalPlan.head.bannerTitle} (Copy)`,
    },
    timesSat: [...originalPlan.timesSat],
    timesSun: [...originalPlan.timesSun],
    cells: originalPlan.cells.map((cell) => ({ text: cell.text })),
    savedAt: new Date(),
  });

  const populatedPlan = await LessonPlan.findById(newPlan._id).populate(
    "createdBy",
    "email name"
  );

  res.status(201).json({
    success: true,
    message: "Lesson plan duplicated successfully",
    data: populatedPlan,
  });
});

// @desc    Search lesson plans (creator's only)
// @route   GET /api/v1/lesson-plans/search
exports.searchLessonPlans = asyncHandler(async (req, res, next) => {
  const { q } = req.query;
  const filter = { createdBy: req.user.id, isActive: true };

  if (q) {
    filter.$or = [
      { "head.bannerTitle": { $regex: q, $options: "i" } },
      { "head.programName": { $regex: q, $options: "i" } },
      { "head.weekLabel": { $regex: q, $options: "i" } },
      { "cells.text": { $regex: q, $options: "i" } },
    ];
  }

  const lessonPlans = await LessonPlan.find(filter)
    .populate("createdBy", "email name")
    .sort({ savedAt: -1 })
    .limit(20);

  res.status(200).json({
    success: true,
    count: lessonPlans.length,
    data: lessonPlans,
  });
});
