const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    subjectSpecialization: {
      type: String,
      required: true,
    },
    qualifications: {
      type: String,
      required: true,
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", TeacherSchema);
