import {RestException} from "../middilwares/RestException";
import {__} from "i18n";

export class HttpException extends Error {
    public status: number;
    public message: string;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.message = message;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundException extends HttpException {
    constructor(message = 'Resource not found') {
        super(404, message);
    }
}

export class BadRequestException extends HttpException {
    constructor(message = 'Bad request') {
        super(400, message);
    }
}

export class ConflictException extends HttpException {
    constructor(message = 'Conflict') {
        super(409, message);
    }
}

export class InternalServerErrorException extends HttpException {
    constructor(message = 'Internal server error') {
        super(500, message);
    }
}
export const validFields = (fields: string[], data: Record<string, any>) => {
    const missingFields = fields.filter(field => !data[field]);
    if (missingFields.length > 0) {
        throw RestException.badRequest(`${__('validation.must_have_fields')} ${missingFields.join(", ")}`);
    }
}
