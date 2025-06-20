import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {StaticOptions} from "../entity/StaticOptions";

const staticOptionsRepository = AppDataSource.getRepository(StaticOptions);

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const options = await staticOptionsRepository.find()

        const result = options.reduce((acc, curr) => {
            acc[curr.key] = curr.value
            return acc
        }, {} as Record<string, string>)

        res.status(200).json({data: result, list: options})
    } catch (error) {
        next(error)
    }
}

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const key = req.body.key
        const value = req.body.value

        await staticOptionsRepository.update(key, { value: value.toString() })

        res.status(200).json({ data: { key, value } })
    } catch (error) {
        next(error)
    }
}
