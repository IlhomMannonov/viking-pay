import {NextFunction, Request, Response} from "express";
import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {AppDataSource} from "../config/db";
import {Card} from "../entity/Card";
import {validFields} from "../utils/CustomErrors";
import {RestException} from "../middilwares/RestException";
import {__} from "i18n";

const cardRepository = AppDataSource.getRepository(Card);

// CREATE
export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        validFields(['name', 'number', 'limit', 'status'], req.body);
        const {name, number, limit, status} = req.body;

        const newCard = cardRepository.create({
            name,
            number,
            limit: Number(limit),
            status: status,
            is_user_card: false
        });
        const result = await cardRepository.save(newCard);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

// READ ALL
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const [cards, total] = await cardRepository
            .createQueryBuilder("card")
            .leftJoinAndSelect("card.tg_account", "tg_account")
            .where("card.deleted = :deleted AND card.is_user_card = :is_user_card", {
                deleted: false,
                is_user_card: false
            })
            .orderBy("card.id", "DESC")
            .skip(offset)
            .take(limit)
            .select([
                "card.id",
                "card.name",
                "card.number",
                "card.limit",
                "card.created_at",
                "card.status",
                "card.card_hold",
                "tg_account.id",
                "tg_account.phone_number",
                "tg_account.name"
            ])
            .getManyAndCount();

        res.json({
            data: cards,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        next(err);
    }
};



// UPDATE
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        validFields(['name', 'number', 'limit', 'status'], req.body);

        const card = await cardRepository.findOneBy({id: Number(req.params.id), deleted: false, is_user_card: false});

        if (!card) throw RestException.notFound(__('card.not_found'))

        cardRepository.merge(card, req.body);
        const result = await cardRepository.save(card);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// DELETE
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

        const card = await cardRepository.findOne({
            where: {
                id: Number(req.params.id),
                deleted: false,
                is_user_card: false
            }
        });

        if (!card) throw RestException.notFound(__('card.not_found'))


        res.status(204).send();
    } catch (err) {
        next(err);
    }
};
