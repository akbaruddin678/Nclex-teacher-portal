const mongoose = require("mongoose");

const CoordinatorSchema = new mongoose.Schema({
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
  },

  campus: {
    // Add this field to reference the campus
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campus",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Coordinator", CoordinatorSchema);
