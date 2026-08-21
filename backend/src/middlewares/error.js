import { ApiError } from "../utils/apierror.js";

const errorHandler = (err, req, res, next) => {
    let error = err;
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Something went wrong";
        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    const response = {
        success: false,
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors,
        // Only leak stack traces outside production
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
    };

    // Log server errors with full stack, but log 4xx operational errors (e.g. 401 Unauthorized) cleanly
    if (error.statusCode >= 500) {
        console.error("Server Error:", err);
    } else {
        console.warn(`[${error.statusCode}] ${error.message} - ${req.originalUrl || req.url}`);
    }

    return res.status(error.statusCode).json(response);
};

export { errorHandler };