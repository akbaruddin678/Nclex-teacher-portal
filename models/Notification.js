const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["principals", "teachers", "both", "all", "admin"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    schedule: {
      type: Date,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
