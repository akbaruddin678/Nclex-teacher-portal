const mongoose = require("mongoose");

const CourseOutlineSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    week: {
      type: Number,
      required: true,
    },
    topics: {
      type: String,
      required: true,
    },
    objectives: {
      type: String,
    },
    resources: {
      type: String,
    },
    assignments: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CourseOutline", CourseOutlineSchema);
