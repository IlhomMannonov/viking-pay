import {NextFunction, Request, Response} from 'express';
import {RestException} from './RestException';
import {HttpStatus} from '../entity/ResponseData/HttpStatus';
import logger from "../config/logger";

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
        logger.error(
            `${req.method} ${req.originalUrl} - ${err.message} \nStack: ${err.stack}`
        )
        console.error('Unexpected error:', err);
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal Server Error'
        })
    }
};
