import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {RestException} from "../middilwares/RestException";
import {__, __mf} from "i18n";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {Card} from "../entity/Card";
import logger from "../config/logger";
import {validFields} from "../utils/CustomErrors";
import {Attachment} from "../entity/Attachment";
import {RabbitMQService} from "../service/MQServise";
import {TelegramMessage} from "../entity/TelegramMessage";
import {get_user_modules} from "./RolePermissionController";
import {exceptions} from "winston";
import axios from "axios";

const userRepository = AppDataSource.getRepository(User);
const cardRepository = AppDataSource.getRepository(Card);
const attachmentRepository = AppDataSource.getRepository(Attachment);
const telegramMessageRepository = AppDataSource.getRepository(TelegramMessage);
const user = process.env.MQ_USER;
const pass = process.env.MQ_PASS;
const ip = process.env.MQ_IP;
export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {

        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))
        req.user.password = null

        if (req.user.role_id) {
            req.user.modules = await get_user_modules(req.user.role_id);
        }
        res.status(200).send({
            success: true, data: {
                id: req.user.id,
                status: req.user.status,
                first_name: req.user.first_name,
                last_name: req.user.last_name,
                phone_number: req.user.phone_number,
                phone_verified: req.user.phone_verified,
                chat_id: req.user.chat_id,
                is_bot_user: req.user.is_bot_user,
                amount: req.user.amount,
                modules: req.user.modules,
                birthday: req.user.birthday,
                logo_id: req.user.logo_id,
            }
        });

    } catch (error) {
        next(error)
    }
}


// USERNI OLIB KELISH BARCHA MALUMOTLARINI
export const get_user = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'));

        const user_id = req.params.user_id
        const user: any = await userRepository.findOne({
            where: {id: Number(user_id), deleted: false},
            select: ['id', 'first_name', 'first_name', 'last_login_time', 'phone_number', 'phone_verified', 'chat_id', 'is_bot_user', 'logo_id', 'birthday'],
        });

        if (!user) throw RestException.badRequest(__('user.not_found'));

        const user_cards = await cardRepository.find({
            where: {
                user_id: Number(user_id),
                deleted: false,
                is_user_card: true
            },
            select: ['name', 'number', 'id']
        });


        res.status(200).send({success: true, data: {user: user, user_cards: user_cards}});
    } catch (err) {
        next(err)
    }
}

// ADMIN
export const all_users = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {

        // Query params
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const q = (req.query.search as string)?.trim();
        const is_system_user = req.query.is_system_user?.toString() === 'true';

        const skip = (page - 1) * limit;

        const queryBuilder = userRepository.createQueryBuilder("user")
            .where("user.deleted = false")
            .andWhere("is_bot_user <> :is_system_user", {is_system_user})

        // Search
        if (q) {
            queryBuilder.andWhere(
                `(user.id::text ILIKE :q OR user.phone ILIKE :q OR user.first_name ILIKE :q OR user.last_name ILIKE :q)`,
                {q: `%${q}%`}
            );
        }

        // Total count
        const total = await queryBuilder.getCount();

        // Pagination + ordering
        const users = await queryBuilder
            .orderBy("user.created_at", "DESC")
            .skip(skip)
            .take(limit)
            .select([
                'user.id',
                'user.first_name',
                'user.last_name',
                'user.phone_number',
                'user.patron',
                'user.last_login_time',
                'user.phone_verified',
                'user.chat_id',
                'user.amount',
                'user.is_bot_user',
                'user.created_at',
            ])
            .getMany();

        logger.info(`Fetched ${users.length} users (page ${page}/${Math.ceil(total / limit)})`);

        res.status(200).json({
            message: "Foydalanuvchilar muvaffaqiyatli olindi",
            data: users,

            total,
            page,
            last_page: Math.ceil(total / limit),
            limit,

        });
        //njkfgsfuj

    } catch (error) {
        next(error);
    }
};

export const update_profile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {first_name, last_name, logo_id, birthday} = req.body;
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))

        const user = req.user

        if (first_name !== undefined) user.first_name = first_name;
        if (last_name !== undefined) user.last_name = last_name;
        if (logo_id !== undefined) user.logo_id = logo_id;
        if (birthday !== undefined) user.birthday = new Date(birthday);

        await userRepository.save(user);
        user.password = undefined;
        return res.status(200).send(user);

    } catch (err) {
        next(err);
    }
};

// ADMIN
export const send_message_telegram = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const {type, caption, file_id, buttons} = req.body;
        validFields(['type', 'caption', 'file_id'], req.body);

        const exists_file = await attachmentRepository.exists({where: {file_name: file_id, deleted: false}});
        if (!exists_file) throw RestException.notFound(__("file.not_found"));
        let inline_buttons = null
        if (buttons) {
            inline_buttons = checkAndGenerateKeyboard(buttons);
            if (!inline_buttons) throw RestException.notFound(__("telegram.buttons_invalid"));
        }

        const all_users = await userRepository.find({
            where: {deleted: false, is_bot_user: true, status: 'active'},
            select: ['chat_id']
        });

        if (all_users.length === 0) {
            logger.warn("No active bot users found");
            return res.status(404).json({message: __('user.no_bot_users_found')});
        }

        logger.info(`Preparing to queue message for ${all_users.length} users`);

        const saved_message = await telegramMessageRepository.save({
            type,
            caption,
            file_id,
            buttons,
            all_users: all_users.length,
            status: "sending"
        })

        const rabbitmq = new RabbitMQService(`amqp://${user}:${pass}@${ip}:5672`);

        await Promise.all(all_users.map(async (user) => {
            const payload: any = {
                type,
                caption,
                file_id,
                chat_id: user.chat_id, // faqat kerakli qismi yuborilyapti
                t_message_id: saved_message.id,
            };
            if (inline_buttons)
                payload['reply_markup'] = inline_buttons;

            await rabbitmq.sendToQueue("telegram-message", JSON.stringify(payload));
        }));

        logger.info(`Queued messages for ${all_users.length} users`);

        return res.status(200).json({
            message: __("telegram.message_queued_successfully"),
            count: all_users.length
        });
    } catch (err) {
        logger.error("Error in send_message_telegram", err);
        next(err);
    }
}
// ADMIN
export const telegram_message_history = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // AGAR HABARLAR JONATILIB BO'LGAN BO'LSA ULARNI STATUSINI O'ZGARTIR
        await AppDataSource
            .getRepository(TelegramMessage)
            .createQueryBuilder()
            .update(TelegramMessage)
            .set({status: 'done'})
            .where('all_users = send_count + un_send_count')
            .andWhere('status = :status', {status: 'sending'})
            .execute()

        const queryBuilder = telegramMessageRepository.createQueryBuilder("tm")
            .where("tm.deleted = false");
        const total = await queryBuilder.getCount();

        const messages = await queryBuilder
            .orderBy("tm.created_at", "DESC")
            .skip(skip)
            .take(limit)
            .getMany()


        res.status(200).send({
            data: messages,
            total,
            page,
            last_page: Math.ceil(total / limit),
            limit,
        })
    } catch (err) {
        next()
    }
}
// ADMIN
export const update_user_status = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user_id = req.params.id;
        const status = req.body.status;
        const user = await userRepository.findOneBy({id: Number(user_id), deleted: false, is_bot_user: true});
        if (!user) throw RestException.notFound(__('user.not_found'));

        if (status !== 'active' && status !== 'blocked') throw RestException.notFound(__mf('user.required_this_statuses', {statuses: "active, blocked"}));

        user.status = status;
        await userRepository.save(user)
        return res.status(200).send({
            data: user,
            success: true,
            message: __mf('user.updated_status', {status: status})
        });

    } catch (err) {
        next(err)
    }
}
export const send_ask_phone = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user
        if (!user) throw RestException.notFound(__('user.not_found'))
        if (!user.is_bot_user) throw RestException.badRequest('Only bot users can use')
        if (!user.chat_id) throw RestException.badRequest('chat_id mavjud emas')

        user.state = 'user_home'
        await userRepository.save(user)
        const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN
        if (!TELEGRAM_BOT_TOKEN) throw new Error('Bot token topilmadi')

        const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

        const messageBody = {
            chat_id: user.chat_id,
            text: '📱 Пожалуйста, отправьте свой номер телефона:',
            reply_markup: {
                keyboard: [
                    [{text: '📲 Отправить номер', request_contact: true}]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        }

        const {data} = await axios.post(telegramApiUrl, messageBody)

        if (!data.ok) {
            throw RestException.badRequest('Telegramga yuborishda xatolik: ' + data.description)
        }

        res.json({success: true, message: 'Telefon raqami so‘rovi yuborildi'})
    } catch (err) {
        next(err)
    }
}


export const delete_user = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user_id = req.params.id;
        const user = await userRepository.findOne({where: {id: Number(user_id)}})
        if (!user) throw RestException.notFound(__('user.not_found'));
        user.deleted = true
        await userRepository.save(user)
res.status(200).send({"OK": true})
    } catch (error) {
        next(error
        )
    }
}

function checkAndGenerateKeyboard(inputText: string) {
    const regex = /([^\s:]+):(\S+)/g;
    const matches = [...inputText.matchAll(regex)];

    if (matches.length === 0) {
        return null;
    }

    const keyboard: { text: string; url: string }[][] = [];
    let row: { text: string; url: string }[] = [];

    for (const match of matches) {
        const [_, text, url] = match;

        if (!isValidUrl(url)) {
            continue; // noto‘g‘ri link — tashlab ketamiz
        }

        row.push({text, url});

        if (row.length === 2) {
            keyboard.push(row);
            row = [];
        }
    }

    if (row.length > 0) {
        keyboard.push(row);
    }

    if (keyboard.length === 0) {
        return null; // hech bir valid tugma yo‘q
    }

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch (_) {
        return false;
    }
}