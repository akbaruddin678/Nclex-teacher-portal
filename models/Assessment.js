// models/Assessment.js
const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    // groups all per-student rows into one assessment batch (e.g. "Quiz 1")
    batchId: { type: String, required: true, index: true },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    // meta applies to all rows in the same batch
    type: {
      type: String,
      enum: [
        "quiz",
        "assignment",
        "midterm",
        "final",
        "project",
        "practical",
        "viva",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, index: true },
    description: { type: String },
    totalMarks: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now, index: true },

    // row-level data
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    marks: { type: Number, default: 0, min: 0 },
    remarks: { type: String },

    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: false,
      index: true,
    },

    // who created the batch
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    createdByRole: {
      type: String,
      enum: ["admin", "principal", "teacher"],
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent the same student being added twice to the same assessment for the same course
assessmentSchema.index({ batchId: 1, course: 1, student: 1 }, { unique: true });

module.exports =
  mongoose.models.Assessment || mongoose.model("Assessment", assessmentSchema);
