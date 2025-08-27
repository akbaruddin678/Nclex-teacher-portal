const mongoose = require("mongoose");

const TopicCellSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { _id: false }
);

const HeaderSchema = new mongoose.Schema(
  {
    city: String,
    bannerTitle: String,
    programName: String,
    weekLabel: String,
    startDateISO: Date,
    endDateISO: Date,
    institute: String,
    unitSat: String,
    unitSun: String,
    unitTag: String,
  },
  { _id: false }
);

const LessonPlanSchema = new mongoose.Schema(
  {
    // Simple creator reference
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Content only
    head: HeaderSchema,
    timesSat: [String], // 5 time slots
    timesSun: [String], // 5 time slots
    cells: [TopicCellSchema], // 10 cells

    // Metadata only
    savedAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LessonPlan", LessonPlanSchema);
