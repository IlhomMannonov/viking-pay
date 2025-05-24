import {Request} from "express";
import {User} from "../User";

export interface AuthenticatedRequest extends Request {
    user?: any;
}
export interface IUser {
    id?: number;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    patron?: string;
    password?: string;
}

