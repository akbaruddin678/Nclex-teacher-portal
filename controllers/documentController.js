const ErrorResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Document = require("../models/Document");
const Student = require("../models/Student");
const path = require("path");
const fs = require("fs");

// @desc    Upload student document
// @route   POST /api/v1/documents
// @access  Private/Student
exports.uploadDocument = asyncHandler(async (req, res, next) => {
  const { documentType } = req.body;

  if (!req.files || !req.files.file) {
    return next(new ErrorResponse("Please upload a file", 400));
  }

  const file = req.files.file;

  // Check file type
  const fileTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!fileTypes.includes(file.mimetype)) {
    return next(
      new ErrorResponse("Please upload a PDF, JPEG, or PNG file", 400)
    );
  }

  // Check file size
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return next(new ErrorResponse("File size must be less than 5MB", 400));
  }

  // Create custom filename
  const extname = path.extname(file.name);
  const filename = `doc_${req.user.id}_${Date.now()}${extname}`;
  const filePath = path.join(__dirname, "../uploads", filename);

  // Save file
  await file.mv(filePath);

  // Create document record
  const document = await Document.create({
    student: req.user.id,
    documentType,
    filePath: filename,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    data: document,
  });
});

// @desc    Verify student document
// @route   PUT /api/v1/documents/:documentId/verify
// @access  Private/Admin
exports.verifyDocument = asyncHandler(async (req, res, next) => {
  const { documentId } = req.params;
  const { status, remarks } = req.body;

  const document = await Document.findById(documentId).populate("student");
  if (!document) {
    return next(new ErrorResponse("Document not found", 404));
  }

  if (document.status !== "pending") {
    return next(new ErrorResponse("Document already processed", 400));
  }

  document.status = status;
  document.remarks = remarks;
  document.verifiedBy = req.user.id;
  document.verifiedAt = Date.now();

  await document.save();

  res.status(200).json({
    success: true,
    data: document,
  });
});

// @desc    Get student documents
// @route   GET /api/v1/documents/student/:studentId
// @access  Private/Admin,Student
exports.getStudentDocuments = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;

  // Students can only view their own documents
  if (req.user.role === "student" && req.user.id !== studentId) {
    return next(
      new ErrorResponse("Not authorized to view these documents", 401)
    );
  }

  const documents = await Document.find({ student: studentId });

  res.status(200).json({
    success: true,
    data: documents,
  });
});
