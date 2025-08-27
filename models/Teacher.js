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
    },
    subjectSpecialization: {
      type: String,
    },
    qualifications: {
      type: String,
    },
    campus: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campus",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Cascade delete user when teacher is removed
TeacherSchema.pre("remove", async function (next) {
  console.log(`Deleting user ${this.user} linked to teacher ${this._id}`);
  await User.findByIdAndDelete(this.user);
  next();
});

module.exports = mongoose.model("Teacher", TeacherSchema);
