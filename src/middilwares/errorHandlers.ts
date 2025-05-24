import {NextFunction, Request, Response} from 'express';
import {RestException} from './RestException';
import {HttpStatus} from '../entity/ResponseData/HttpStatus';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof RestException) {
        res.status(err.status).json({
            message: err.message,
            errors: err.errors,
            resource: err.resourceName,
            field: err.fieldName,
            value: err.fieldValue,
            code: err.errorCode
        });
    } else {
        console.error('Unexpected error:', err);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Internal server error',
        });
    }
};
