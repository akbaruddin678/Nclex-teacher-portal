const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

exports.getAllUsers = async (req, res, next) => {
  try {
    // Only admin can see all users
    if (req.user.role !== "admin") {
      return next(
        new AppError(
          "You are not authorized to view all users",
          StatusCodes.FORBIDDEN
        )
      );
    }

    const features = new APIFeatures(User.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const users = await features.query;

    res.status(StatusCodes.OK).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new AppError("No user found with that ID", StatusCodes.NOT_FOUND)
      );
    }

    // Only admin can see any user, coordinators can see their campus teachers
    if (req.user.role === "admin") {
      // Admin can see anyone
    } else if (req.user.role === "coordinator") {
      if (
        user.role === "admin" ||
        (user.role === "coordinator" &&
          user._id.toString() !== req.user._id.toString())
      ) {
        return next(
          new AppError(
            "You are not authorized to view this user",
            StatusCodes.FORBIDDEN
          )
        );
      }
      if (
        user.role === "teacher" &&
        user.campus.toString() !== req.user.campus.toString()
      ) {
        return next(
          new AppError(
            "You are not authorized to view this teacher",
            StatusCodes.FORBIDDEN
          )
        );
      }
    } else if (
      req.user.role === "teacher" &&
      user._id.toString() !== req.user._id.toString()
    ) {
      return next(
        new AppError(
          "You can only view your own profile",
          StatusCodes.FORBIDDEN
        )
      );
    }

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    // 1) Filter out unwanted fields names that are not allowed to be updated
    const filteredBody = {};
    const allowedFields = ["name", "email"];

    if (req.user.role === "admin") {
      allowedFields.push("role", "campus");
    }

    Object.keys(req.body).forEach((el) => {
      if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
    });

    // 2) Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(
        new AppError("No user found with that ID", StatusCodes.NOT_FOUND)
      );
    }

    // 3) Check permissions
    if (req.user.role === "admin") {
      // Admin can update anyone
    } else if (req.user.role === "coordinator") {
      if (user.role === "admin") {
        return next(
          new AppError("You cannot update an admin", StatusCodes.FORBIDDEN)
        );
      }
      if (
        user.role === "coordinator" &&
        user._id.toString() !== req.user._id.toString()
      ) {
        return next(
          new AppError(
            "You can only update your own profile",
            StatusCodes.FORBIDDEN
          )
        );
      }
      if (
        user.role === "teacher" &&
        user.campus.toString() !== req.user.campus.toString()
      ) {
        return next(
          new AppError(
            "You can only update teachers in your campus",
            StatusCodes.FORBIDDEN
          )
        );
      }
    } else if (
      req.user.role === "teacher" &&
      user._id.toString() !== req.user._id.toString()
    ) {
      return next(
        new AppError(
          "You can only update your own profile",
          StatusCodes.FORBIDDEN
        )
      );
    }

    // 4) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new AppError("No user found with that ID", StatusCodes.NOT_FOUND)
      );
    }

    // Check permissions
    if (req.user.role === "admin") {
      // Admin can delete anyone except themselves
      if (user._id.toString() === req.user._id.toString()) {
        return next(
          new AppError("You cannot delete yourself", StatusCodes.FORBIDDEN)
        );
      }
    } else if (req.user.role === "coordinator") {
      if (user.role === "admin") {
        return next(
          new AppError("You cannot delete an admin", StatusCodes.FORBIDDEN)
        );
      }
      if (user.role === "coordinator") {
        return next(
          new AppError(
            "You cannot delete another coordinator",
            StatusCodes.FORBIDDEN
          )
        );
      }
      if (
        user.role === "teacher" &&
        user.campus.toString() !== req.user.campus.toString()
      ) {
        return next(
          new AppError(
            "You can only delete teachers in your campus",
            StatusCodes.FORBIDDEN
          )
        );
      }
    } else {
      return next(
        new AppError(
          "You are not authorized to delete users",
          StatusCodes.FORBIDDEN
        )
      );
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(StatusCodes.NO_CONTENT).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
