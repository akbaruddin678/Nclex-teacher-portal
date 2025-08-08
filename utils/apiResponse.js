class ErrorResponse extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;

    // Capture stack trace (excluding constructor call from it)
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      statusCode: this.statusCode,
      details: this.details,
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }
}

module.exports = ErrorResponse;
