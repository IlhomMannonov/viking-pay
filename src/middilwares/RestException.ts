import {HttpStatus} from '../entity/ResponseData/HttpStatus';
import {ErrorData} from '../entity/ResponseData/ErrorData';
import {__} from "i18n";

export class RestException extends Error {
    public status: HttpStatus;
    public resourceName?: string;
    public fieldName?: string;
    public fieldValue?: any;
    public errors?: ErrorData[];
    public errorCode?: number;

    constructor(
        userMsg: string,
        status: HttpStatus,
        resourceName?: string,
        fieldName?: string,
        fieldValue?: any,
        errors?: ErrorData[],
        errorCode?: number
    ) {
        super(userMsg);
        this.status = status;
        this.resourceName = resourceName;
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
        this.errors = errors;
        this.errorCode = errorCode;
    }

    static restThrow(userMsg: string, status: HttpStatus): RestException {
        return new RestException(userMsg, status);
    }

    static restThrowWithErrorCode(userMsg: string, errorCode: number, status: HttpStatus): RestException {
        return new RestException(userMsg, status, undefined, undefined, undefined, [new ErrorData(userMsg, errorCode)], errorCode);
    }

    static restThrowWithDetails(resourceName: string, fieldName: string, fieldValue: any, userMsg: string): RestException {
        return new RestException(userMsg, HttpStatus.BAD_REQUEST, resourceName, fieldName, fieldValue);
    }

    static restThrowWithErrors(errors: ErrorData[], status: HttpStatus): RestException {
        return new RestException('', status, undefined, undefined, undefined, errors);
    }

    static notFound(resourceKey: string): RestException {
        return new RestException(`${resourceKey}`, HttpStatus.NOT_FOUND);
    }

    static otherServiceError(serviceName: string): RestException {
        return new RestException(`Error from service ${serviceName}`, HttpStatus.BAD_REQUEST);
    }

    static badRequest(resourceKey: string): RestException {
        return new RestException(`${resourceKey}`, HttpStatus.BAD_REQUEST);
    }

    static alreadyExists(resourceKey: string): RestException {
        return new RestException(`Resource ${resourceKey} already exists`, HttpStatus.CONFLICT);
    }

    static attackResponse(): RestException {
        return new RestException(`Attack response`, HttpStatus.BAD_REQUEST);
    }

    static forbidden(): RestException {
        return new RestException(`Forbidden`, HttpStatus.FORBIDDEN);
    }

    static internalServerError(): RestException {
        return new RestException(`Internal server error`, HttpStatus.INTERNAL_SERVER_ERROR);

    }

    static noPermission(): RestException {
        return new RestException(__('role.no_access_method'), HttpStatus.FORBIDDEN);
    }
}