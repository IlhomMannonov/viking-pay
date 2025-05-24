import {NextFunction, Request, Response} from "express";
import {AppDataSource} from "../config/db";
import {Provider} from "../entity/Provider";

const providerRepository = AppDataSource.getRepository(Provider);

export const getAllProviders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // if
    // const {chat_id} = req.query;
    // if (!chat_id) throw new Error("chat_id");
}

