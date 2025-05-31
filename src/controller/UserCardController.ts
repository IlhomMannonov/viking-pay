import {NextFunction, Request, Response} from "express";
import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {AppDataSource} from "../config/db";
import {Card} from "../entity/Card";
import {validFields} from "../utils/CustomErrors";
import {RestException} from "../middilwares/RestException";
import {__} from "i18n";
import cardRouter from "../routers/CardRouter";
import {User} from "../entity/User";

const cardRepository = AppDataSource.getRepository(Card);
const userRepository = AppDataSource.getRepository(User);

// CREATE
export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))

        validFields(['name', 'number'], req.body);

        const {name, number, card_img} = req.body;

        const existingCard = await cardRepository.exists({where: {number: number, deleted: false, is_user_card: true}})
        if (existingCard) throw RestException.badRequest(__('card.exists'))
        const newCard = cardRepository.create({
            name,
            card_img,
            number,
            is_user_card: true,
            user_id: req.user.id,
        });
        const result = await cardRepository.save(newCard);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

// READ ALL
export const my_cards = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const [cards, total] = await cardRepository.findAndCount({
            where: {deleted: false, is_user_card: true, user_id: req.user.id},
            skip: offset,
            take: limit,
            order: {id: 'DESC'},
            select: ['id', 'name', 'number', 'created_at', 'status', 'card_img'],
        });

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
        validFields(['name', 'number'], req.body);

        const card = await cardRepository.findOneBy({id: Number(req.params.id), deleted: false, is_user_card: true});

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
                is_user_card: true
            }
        });

        if (!card) throw RestException.notFound(__('card.not_found'))
        card.deleted = true;
        await cardRepository.save(card)

        res.status(200).send({success: true, message: __('card.removed')});
    } catch (err) {
        next(err);
    }
};


export const user_cards = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const user = await userRepository.findOne({
            where: {deleted: false, id: Number(req.params.id)},
            select: ['id', 'first_name', 'last_name', 'updated_at', 'created_at', 'amount','phone_number','status']
        });
        const [cards, total] = await cardRepository.findAndCount({
            where: {deleted: false, is_user_card: true, user_id: Number(req.params.id)},
            skip: offset,
            take: limit,
            order: {id: 'DESC'},
            select: ['id', 'name', 'number', 'created_at', 'status','card_img'],
        });

        res.json({
            data: cards,
            user,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        next(err);
    }
};