const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    documentType: {
      type: String,
      enum: ["cnic", "educational", "other"],
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    remarks: {
      type: String,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Check if model already exists before defining it
module.exports =
  mongoose.models.Document || mongoose.model("Document", documentSchema);
