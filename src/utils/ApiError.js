class ApiError extends Error {
    constructor(statusCode, message, data = null) {
        super(message);
        this.statusCode = statusCode;
        this.data = data;
        this.success = false;
        this.error = [message];

        if (process.env.NODE_ENV === 'development') {
            this.stack = Error.captureStackTrace();
        }
    }
}

export default ApiError;
