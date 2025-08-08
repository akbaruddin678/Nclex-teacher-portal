const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    type: {
      type: String,
      enum: ["quiz", "assignment", "midterm", "final"],
      required: true,
    },
    marks: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    remarks: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Check if model already exists before defining it
module.exports =
  mongoose.models.Assessment || mongoose.model("Assessment", assessmentSchema);
