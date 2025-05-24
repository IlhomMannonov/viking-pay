import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {Provider} from "../entity/Provider";
import {RestException} from "../middilwares/RestException";
import {__} from "i18n";
import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {validFields} from "../utils/CustomErrors";
import {Like} from "typeorm";
import {CashDesk} from "../service/XProviderService";

const providerRepository = AppDataSource.getRepository(Provider);

export const getAllProviders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json(await providerRepository.find({
        where: {status: 'active', deleted: false},
        order: {id: 'ASC'},
        select: ['id', 'name', 'status', 'max_amount', 'min_amount', 'logo_id']
    }));
}
export const getBiyId = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {provider_id} = req.params;
        if (!provider_id) throw RestException.badRequest("Provider is Required");

        const provider = await providerRepository.findOne({
            where: {id: Number.parseInt(provider_id), deleted: false},
            select: ['id', 'name', 'status', 'max_amount', 'min_amount', 'logo_id']
        })
        if (!provider) throw RestException.badRequest(__('provider.not_found'));

        res.status(200).send(provider)
    } catch (error) {
        next(error)
    }
}

//ADMIN
export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))
        const {name, min_amount, api, max_amount, hash, cashierpass, login, cashdeskid, logo_id} = req.body;
        validFields(['name', 'min_amount', 'max_amount', 'api', 'hash', 'cashierpass', 'login', 'cashdeskid'], req.body)

        // Entity yaratamiz
        const provider = providerRepository.create({
            name,
            min_amount,
            max_amount,
            hash,
            cashierpass,
            login,
            cashdeskid,
            api,
            logo_id,
        });

        const cashDesk = new CashDesk(api, hash, cashierpass, login, cashdeskid);

        const check = await cashDesk.checkProvider()

        if (!check) throw RestException.badRequest(__('provider.not_found_from_api'));

        await providerRepository.save(provider);

        res.status(200).send(provider)
    } catch (err) {
        next(err)
    }
}
//ADMIN
export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw RestException.badRequest(__('user.no_user_in_header'));
        }

        const {id} = req.params;
        const {name, min_amount, api, max_amount, hash, cashierpass, login, cashdeskid, logo_id} = req.body;

        const provider = await providerRepository.findOneBy({id: Number(id)});
        if (!provider || provider.deleted) {
            throw RestException.notFound(__('provider.not_found'));
        }

        provider.name = name ?? provider.name;
        provider.min_amount = min_amount ?? provider.min_amount;
        provider.max_amount = max_amount ?? provider.max_amount;
        provider.hash = hash ?? provider.hash;
        provider.cashierpass = cashierpass ?? provider.cashierpass;
        provider.login = login ?? provider.login;
        provider.cashdeskid = cashdeskid ?? provider.cashdeskid;
        provider.api = api ?? provider.api;
        provider.logo_id = logo_id ?? provider.logo_id;

        await providerRepository.save(provider);

        res.status(200).json(provider);
    } catch (err) {
        next(err);
    }
};
//ADMIN
export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw RestException.badRequest(__('user.no_user_in_header'));
        }

        const {id} = req.params;

        const provider = await providerRepository.findOneBy({id: Number(id)});
        if (!provider || provider.deleted) {
            throw RestException.notFound(__('provider.not_found'));
        }

        provider.deleted = true;
        await providerRepository.save(provider);

        res.status(200).json({success: true, message: __('provider.deleted')});
    } catch (err) {
        next(err);
    }
};

//ADMIN
export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';

        const whereCondition = {
            deleted: false,
            ...(search ? {name: Like(`%${search}%`)} : {}),
        };

        const [items, total] = await providerRepository.findAndCount({
            where: whereCondition,
            order: {created_at: 'DESC'},
            skip: (page - 1) * limit,
            take: limit,
            select: ['id', 'name', 'status', 'max_amount', 'min_amount', 'logo_id', 'created_at', 'updated_at', 'hash', 'cashdeskid', 'cashierpass', 'login', 'api', 'logo_id'],
        });

        res.status(200).json({
            data: items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        next(err);
    }
};
