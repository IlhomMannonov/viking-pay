import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {TgAccount} from "../entity/TgAccount";
import {Api, TelegramClient} from "telegram";
import {StringSession} from "telegram/sessions";
import {RestException} from "../middilwares/RestException";
import {__} from "i18n";
import {NewMessage, NewMessageEvent} from "telegram/events";
import {getTelegramClient} from "../service/TelegramSessionPoolService";
import {validFields} from "../utils/CustomErrors";
import {Card} from "../entity/Card";
import logger from "../config/logger";

const apiId = 17403927; // O'zingizning API ID'ingizni yozing
const apiHash = "6f3b02b8ba446d2c76a31033d6717dc2"; // O'zingizning API Hash'ingiz
const userRepository = AppDataSource.getRepository(User);
const tgAccountRepository = AppDataSource.getRepository(TgAccount);
const cardRepository = AppDataSource.getRepository(Card);
const stringSession = new StringSession("");

const user = process.env.MQ_USER;
const pass = process.env.MQ_PASS;
const ip = process.env.MQ_IP;

// ADMIN
export const enter_phone = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const {phone}: { phone: string } = req.body;

    if (!phone) throw RestException.badRequest(__('telegram.not_null_phone'));


    let client = new TelegramClient(stringSession, apiId, apiHash, {connectionRetries: 5});

    let connected = false;

    try {
        await client.connect();
        connected = true;

        const sendCode = async () => {
            return await client.invoke(new Api.auth.SendCode({
                phoneNumber: phone,
                apiId: apiId,
                apiHash: apiHash,
                settings: new Api.CodeSettings({})
            }));
        };

        let result: any

        result = await sendCode();

        const phoneCodeHash = result.phoneCodeHash;
        logger.info(`(UserId: ${req.user.id}) |  ${phone} raqamiga telegramdan kod jonatildi`)

        res.json({
            success: true,
            message: __('telegram.code_send'),
            data: {phone, phoneCodeHash},
        });
    } catch (error: any) {
        console.error("❌ Xato:", error);
        if (connected) {
            await client.disconnect();
            await client.destroy();
        }
        res.status(500).json({
            success: false,
            message: __('telegram.server_error'),
            error: error.message,
        });
    }
};
// ADMIN
export const enter_code = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const {code, phoneNumber, phoneCodeHash} = req.body;

    if (!code)
        throw RestException.badRequest(__('telegram.not_null_code'));

    const client = new TelegramClient(stringSession, apiId, apiHash, {connectionRetries: 5});
    try {
        await client.connect();
        const result = await client.invoke(new Api.auth.SignIn({
            phoneNumber: phoneNumber,
            phoneCodeHash: phoneCodeHash,
            phoneCode: String(code),
        }));

        const session = client.session.save(); // Sessionni saqlab qo'yamiz
        await client.disconnect()
        await client.destroy()
        let tg = await tgAccountRepository.findOne({where: {deleted: false, phone_number: phoneNumber}});
        logger.info(`(UserId: ${req.user.id}) |  ${phoneNumber} raqami uchun tasdiqlash kodi kiritildi ${code}`)

        if (tg) {
            tg.session_id = String(session)
            await tgAccountRepository.save(tg)

        } else {
            tg = await tgAccountRepository.save({
                name: phoneNumber + " Account",
                phone_number: phoneNumber,
                session_id: String(session),
            });
        }


        res.json({success: true, data: tg});
    } catch (error: any) {
        if (error.errorMessage === "SESSION_PASSWORD_NEEDED") {
            const session = client.session.save(); // YARIM login session
            const passwordInfo = await client.invoke(new Api.account.GetPassword());
            const hint = passwordInfo.hint;

            res.status(401).json({
                success: false,
                error: "2FA parol kerak!",
                needPassword: true,
                hint,
                session // Frontendga yuboriladi
            });
        } else {
            console.error(error);
            res.status(500).json({success: false, error: error.message});
        }
    }
}
// ADMIN
export const get_cards = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {


        // Disconnect qilish
        // await client.disconnect();
        const cards = await get_tg_cards(Number(req.query.account))
        // Javob yuborish
        res.status(200).json({
            success: true,
            data: cards,
        });

    } catch (err: any) {
        next(err)

    }
};
// ADMIN
export const connect_system_card = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {card_id, tg_account_id, card_hold} = req.body;
        validFields(['card_id', 'tg_account_id', 'card_hold'], req.body);

        const card = await cardRepository.findOne({where: {id: card_id, deleted: false, is_user_card: false}});
        if (!card) throw RestException.notFound(__('card.not_found'));

        const tg_account = await tgAccountRepository.findOne({where: {id: tg_account_id, deleted: false}});
        if (!tg_account) throw RestException.notFound(__('telegram.not_found'));

        const client = await getTelegramClient(tg_account.session_id);

        //TELERGAM BILAN ULASNISH MAVJUDMI HOZIRXAM
        const isAuthorized = await client.isUserAuthorized();
        if (!isAuthorized) throw RestException.notFound(__('telegram.session_not_active'));

        const cards = await get_tg_cards(tg_account_id);
        const card_holder = getCardInfoByNumber(cards.cards, card_hold)

        if (!card_holder) throw RestException.notFound(__('card.telegram_not_found'));

        card.tg_account_id = tg_account.id;
        card.card_hold = card_hold;
        await cardRepository.save(card)


        logger.info(`(UserId: ${req.user.id}) | Telegram ${tg_account.name} ning ${card_holder} kartaasi Sistemaning ${card.name} ga ulandi`)




        res.status(200).json({
            success: true, data: {system_card: card, telegram_card: card_holder}, message: __('card.connected')
        })
    } catch (err) {
        next(err)
    }
}
// ADMIN
export const tg_users = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let users = await tgAccountRepository.find({
            where: {deleted: false},
            order: {created_at: "DESC"},
        });

        // Har bir user uchun async tekshiruvni kutib bajarish
        await Promise.all(users.map(async (user: any) => {
            const client = await getTelegramClient(user.session_id);
            user.is_authorized = await client.isUserAuthorized();
            user.session_id = null; // xavfsizlik uchun sessiyani olib tashlayapmiz
        }));

        res.status(200).send({success: true, data: users});
    } catch (err) {
        next(err);
    }
};
// ADMIN
export const delete_account = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {


        const tg_user_id = req.params.id;
        const user = await tgAccountRepository.findOne({where: {id: Number(tg_user_id), deleted: false}});
        if (!user) throw RestException.notFound(__('user.not_found'));

        user.deleted = true;

        const system_cards = await cardRepository.find({where: {tg_account_id: Number(tg_user_id), deleted: false}});
        system_cards.forEach((card: Card) => {
            card.card_hold = ''
            card.tg_account_id = null;
        })
        await cardRepository.save(system_cards)
        await tgAccountRepository.save(user)

        logger.info(`(UserId: ${req.user.id}) | Telegram ${user.name} delete qilindi, Bungs ulangan sistema kartalari uzildi`)

        res.status(200).send({success: true});

    } catch (err) {
        next(err)
    }
}

export function getCardInfoByNumber(parsedCards: any[], cardNumber: string): any | null {
    return parsedCards.find(card => card.card_number === cardNumber) || null;
}

export async function get_tg_cards(tg_account_id: number) {

    const tg = await tgAccountRepository.findOne({
        where: {id: Number(tg_account_id), deleted: false}
    });

    if (!tg) throw RestException.notFound(__('telegram.not_found'));


    const client = await getTelegramClient(tg.session_id)

    //TELERGAM BILAN ULASNISH MAVJUDMI HOZIRXAM
    const isAuthorized = await client.isUserAuthorized();
    if (!isAuthorized) {
        throw RestException.badRequest(__('telegram.session_not_active'));
    }

    const eventHandler = new NewMessage({});

    const waitForReply = () => {
        return new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                client.removeEventHandler(handler, eventHandler);
                reject(new Error("Bot ishlamayapti yoki javob kelmadi"));
            }, 10000); // 10 soniya kutadi

            const handler = async (event: NewMessageEvent) => {
                const msg = event.message;

                // Faqat kiruvchi xabarlar va kerakli formatdagi javobni tekshiramiz
                if (!msg.out && msg.message.includes("💳 Umumiy balans")) {
                    client.removeEventHandler(handler, eventHandler);
                    clearTimeout(timeout);
                    resolve(msg.message);
                }
            };

            client.addEventHandler(handler, eventHandler);
        });
    };

    // Botga xabar yuboramiz
    await client.sendMessage("@CardXabarBot", {
        message: "💰 Karta balansi",
    });

    // Javobni kutamiz
    const botMessage = await waitForReply();

    // Javobni jsonga aylantiramiz
    return parseBalanceText(botMessage);
}

function parseBalanceText(text: string) {
    const result = {
        total_balance: 0,
        cards: [] as {
            card_number: string,
            bank: string,
            owner: string,
            balance: number
        }[]
    };

    // Umumiy balansni ajratamiz
    const totalBalanceMatch = text.match(/💰 ([\d\s.,']+)\s*so'm/);
    if (totalBalanceMatch) {
        result.total_balance = parseFloat(totalBalanceMatch[1].replace(/\s/g, '').replace(',', '.'));
    }

    // Har bir karta bo‘yicha ma’lumotni ajratamiz
    const cardBlocks = text.split("💳 Karta:").slice(1); // Birinchi qism umumiy balans

    for (const block of cardBlocks) {
        const lines = block.trim().split("\n").map(l => l.trim());

        const card_number = lines[0];
        const bank = lines[1]?.replace("🏦 Bank: ", "").trim();
        const owner = lines[2]?.replace("👤 ", "").trim();
        const balanceMatch = lines[3]?.match(/💸 ([\d\s.,']+)\s*so'm/);
        const balance = balanceMatch
            ? parseFloat(balanceMatch[1].replace(/\s/g, '').replace(',', '.'))
            : 0;

        result.cards.push({
            card_number,
            bank,
            owner,
            balance
        });
    }

    return result;
}
