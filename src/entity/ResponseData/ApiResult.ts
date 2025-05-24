import {ErrorData} from './ErrorData';

export class ApiResult<T> {
    success: boolean;
    message?: string;
    errors?: ErrorData[];
    data?: T;

    private constructor(success: boolean, message?: string, errors?: ErrorData[], data?: T) {
        this.success = success;
        this.message = message;
        this.errors = errors;
        this.data = data;
    }

    static errorResponse(message: string, code: number): ApiResult<null> {
        return new ApiResult<null>(false, message, [new ErrorData(message, code)]);
    }

    // static errorResponse(errors: ErrorData[]): ApiResult<null> {
    //     return new ApiResult<null>(false, undefined, errors);
    // }

}
