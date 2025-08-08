const ErrorResponse = require("../utils/apiResponse");

const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error for debugging

  let error = {
    statusCode: err.statusCode || 500,
    message: err.message || "Server Error",
  };

  // Handle specific error types
  if (err.name === "ValidationError") {
    error.statusCode = 400;
    error.message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  if (err.code === 11000) {
    error.statusCode = 400;
    error.message = "Duplicate field value entered";
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
  });
};

module.exports = errorHandler;
