const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  console.error('[Error Details]:', err);

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check your input parameters.',
      errors: formattedErrors,
    });
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: 'Database Validation Error',
      errors: messages,
    });
  }

  // Handle Mongoose Bad ObjectId / Cast Error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Resource not found with specified ID: ${err.value}`,
    });
  }

  // Handle Duplicate Key Error (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  const statusCode = err.status || err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error occurred.',
  });
};

module.exports = errorHandler;
