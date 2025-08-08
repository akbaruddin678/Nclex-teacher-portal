const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Campus = require("../models/Campus");

// @desc    Create campus
// @route   POST /api/v1/campuses
// @access  Private/Admin
exports.createCampus = asyncHandler(async (req, res, next) => {
  const { name, location, address, contactNumber } = req.body;

  const campus = await Campus.create({
    name,
    location,
    address,
    contactNumber,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: campus,
  });
});

// @desc    Get all campuses
// @route   GET /api/v1/campuses
// @access  Private/Admin
exports.getCampuses = asyncHandler(async (req, res, next) => {
  const campuses = await Campus.find().populate("createdBy", "name email");
  res.status(200).json({
    success: true,
    count: campuses.length,
    data: campuses,
  });
});

// @desc    Update campus
// @route   PUT /api/v1/campuses/:id
// @access  Private/Admin
exports.updateCampus = asyncHandler(async (req, res, next) => {
  const campus = await Campus.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!campus) {
    return next(
      new ErrorResponse(`Campus not found with id ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: campus,
  });
});

// @desc    Delete campus
// @route   DELETE /api/v1/campuses/:id
// @access  Private/Admin
exports.deleteCampus = asyncHandler(async (req, res, next) => {
  const campus = await Campus.findByIdAndDelete(req.params.id);

  if (!campus) {
    return next(
      new ErrorResponse(`Campus not found with id ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});
