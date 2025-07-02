import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {Transaction} from "../entity/Transaction";
import {validFields} from "../utils/CustomErrors";
import {Card} from "../entity/Card";
import {getAvailableCard} from "../service/CardService";
import {RestException} from "../middilwares/RestException";
import {__, __mf} from "i18n";
import logger from '../config/logger';
import {Not} from "typeorm";
import {User} from "../entity/User";
import {RabbitMQService} from "../service/MQServise";
import {groupBy} from 'lodash';
import {StaticOptions} from "../entity/StaticOptions";
import {send_message} from "../service/TGChanelServise"; // kerak bo‘lsa o‘rnat: npm i lodash


const transactionRepository = AppDataSource.getRepository(Transaction);
const cardRepository = AppDataSource.getRepository(Card);
const userRepository = AppDataSource.getRepository(User);
const staticOptionsRepository = AppDataSource.getRepository(StaticOptions);
const user = process.env.MQ_USER;
const pass = process.env.MQ_PASS;
const ip = process.env.MQ_IP;
export const create_deposit = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))
        validFields(['amount'], req.body)
        const {amount} = req.body;

        if (!req.user.phone_number) throw RestException.badRequest(__('user.not_full_auth_for_phone'))

        const max_d = await staticOptionsRepository.findOne({where: {key: "max_deposit"}})
        const min_d = await staticOptionsRepository.findOne({where: {key: "min_deposit"}})

        const maxDeposit = max_d ? Number(max_d.value) : 0
        const minDeposit = min_d ? Number(min_d.value) : 0

        if (amount > maxDeposit) throw RestException.notFound(__mf('transaction.max_deposit', {amount: maxDeposit}));
        if (amount < minDeposit) throw RestException.notFound(__mf('transaction.min_deposit', {amount: minDeposit}));


        logger.info(`${req.user.id} - foydalanuvchi ${amount} miqdorida depozit qilmoqda`)
        let card = await getAvailableCard(amount);

        const tr = transactionRepository.create({
            amount: amount,
            soft_amount: amount,
            user_id: req.user.id,
            card_id: card.card.id,
            card_number: card.card.number,
            card_name: card.card.name,
            status: "pending_deposit",
            desc: "Deposit VikingPay",
            program: true,
            last_card_amount: Number(card.card_info.balance),

        });

        const saved_tr = await transactionRepository.save(tr)

        logger.info(`${saved_tr.id} - raqamli tranzaksiya yaratildi. ${req.user.id} - id User uchun `)

        res.status(200).send({success: true, data: {...card, ...saved_tr}});

    } catch (err) {
        next(err)
    }
}

//i_payed statusda bo'lsa timer ishlash kerak
//TODO bu funksiyaga avto tekshiruv qo'yiladi
export const complete_pay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {

        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))
        // USER TOLIQ AUTH QILGANMI?
        if (!req.user.phone_number) throw RestException.badRequest(__('user.not_full_auth_for_phone'))

        const {trans_id, status} = req.body;

        validFields(['trans_id', 'status'], req.body)

        const transaction = await transactionRepository.findOneBy({
            id: trans_id,
            deleted: false,
            status: "pending_deposit"
        });

        if (!transaction) throw RestException.notFound(__('transaction.not_found'))

        if (status == true) {
            transaction.status = 'i_payed'
        } else {
            transaction.status = 'reject'
            //     TRANSAKSIYAGA ULANGAN KARTANI AKTIVLASHTIRIB QO'YAMIZ
            await makeAvailableCard(transaction)
        }
        logger.info(`${req.user.id} - Foydlanuchi ${transaction.id} - Tranzaksiyani ${transaction.status} qilib tasdiqladi`)

        await transactionRepository.save(transaction);

        (transaction as any).timer = getTransTime(transaction);
        // TASDIQLANGAN TRANZAKSIYANI QUEUEGA JONATAMIZ
        if (status == true) {
            const rabbitmq = new RabbitMQService(`amqp://${user}:${pass}@${ip}:5672`);
            await rabbitmq.sendToQueue("card-transaction", JSON.stringify(transaction));
        }

        if (status == true)
            res.status(200).send({success: true, data: transaction, message: __('transaction.send_checking')});
        else
            res.status(200).send({success: true, data: transaction, message: __('transaction.rejected')});

    } catch (err) {
        next(err)
    }
}


export const my_transactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'));

        const userId = req.user.id;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const fromTimestamp = req.query.from_date ? Number(req.query.from_date) : null;
        const toTimestamp = req.query.to_date ? Number(req.query.to_date) : null;

        const fromDate = fromTimestamp ? new Date(fromTimestamp) : null;
        const toDate = toTimestamp ? new Date(toTimestamp) : null;

        const queryBuilder = transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.provider', 'provider')
            .where('transaction.user_id = :userId', {userId})
            .andWhere('transaction.deleted = false');

        if (fromDate && toDate) {
            queryBuilder.andWhere('transaction.created_at BETWEEN :fromDate AND :toDate', {fromDate, toDate});
        } else if (fromDate) {
            queryBuilder.andWhere('transaction.created_at >= :fromDate', {fromDate});
        } else if (toDate) {
            queryBuilder.andWhere('transaction.created_at <= :toDate', {toDate});
        }

        queryBuilder
            .select([
                'transaction.id',
                'transaction.created_at',
                'transaction.status',
                'transaction.amount',
                'transaction.user_id',
                'transaction.card_id',
                'transaction.card_number',
                'transaction.card_name',
                'transaction.type',
                'transaction.program',
                'transaction.bet_provider',
                'transaction.desc',
                'provider.id',
                'provider.name',
                'provider.min_amount',
                'provider.max_amount',
                'provider.logo_id',
            ])
            .orderBy('transaction.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [transactions, total] = await queryBuilder.getManyAndCount();

        let updated_transactions = [];

        for (const item of transactions) {
            let timer = 0;
            if (item.status === 'pending_deposit') {
                timer = getTransTime(item);

                if (timer === 0) {
                    item.status = 'reject';
                    updated_transactions.push(item);
                }
            }
            (item as any).timer = timer;
        }

        await transactionRepository.save(updated_transactions);

        const cardIds = updated_transactions.filter(t => t.card_id).map(t => t.card_id);
        const uniqueCardIds = [...new Set(cardIds)];

        if (uniqueCardIds.length) {
            await AppDataSource
                .createQueryBuilder()
                .update(Card)
                .set({status: 'active'})
                .whereInIds(uniqueCardIds)
                .execute();
        }

        // === Guruhlash: Sanaga qarab ===
        const grouped = groupBy(transactions, (t: Transaction) =>
            new Date(t.created_at).toISOString().split('T')[0]
        );

        const formatted = Object.entries(grouped).map(([date, txns]) => ({
            date,
            transactions: txns
        }));

        res.json({
            data: formatted,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
};


//USER HISOBIGA DEPOZITINI TASDIQLAYDI YOKI BEKOR QILADI
export const update_transaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))

        const {trans_id, status} = req.body;

        validFields(['trans_id', 'status'], req.body)

        const transaction = await transactionRepository.findOneBy({
            id: trans_id,
            deleted: false,
            status: Not('pending_deposit')
        });

        if (!transaction) throw RestException.notFound(__('transaction.not_found'))

        if (transaction.status !== 'i_payed') throw RestException.notFound(__('transaction.not_available_update_status'))

        if (status == 'reject') {
            transaction.status = 'reject'
        } else if (status == 'success_pay') {
            transaction.status = 'success_pay';
            //USERGA PUL ADMIN TOMONIDAN TASDIQLANDI
            await addUserBalance(transaction.user_id, transaction)
        }
        await transactionRepository.save(transaction);
        logger.info(`${transaction.id} - Tranzaksiya statusini ${req.user.id} - Foydalanuvchisi, ${transaction.status} ga o'zgartirdi`);

        //     TRANSAKSIYAGA ULANGAN KARTANI AKTIVLASHTIRIB QO'YAMIZ
        await makeAvailableCard(transaction)

        res.status(200).send({success: true, message: __('transaction.updated_status'), data: transaction});

    } catch (err) {
        next(err)
    }
}

// TRANZAKSIYAMNI ID ORQALI OLIASH
export const get_my_transaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) throw RestException.badRequest(__('user.no_user_in_header'))
        const trans_id = req.params.trans_id;

        //FAQAT O'ZINI TRANZAKSIYASINI CHAQIRADI
        const trans = await transactionRepository.findOne({
            where: {
                id: trans_id,
                deleted: false,
                user_id: req.user.id
            },
            select: ['id', 'status', 'amount', 'user_id', 'provider_id', 'card_id', 'card_number', 'card_name', 'type', 'created_at', 'bet_provider'],
            relations: ['provider']
        });
        if (!trans) throw RestException.notFound(__('transaction.not_found'));


        (trans as any).timer = getTransTime(trans);

        res.status(200).send({success: true, data: trans});

    } catch (err) {
        next(err)
    }
}

// USERNING PUL CHIQARISHGA ZAPROSI
export const withdraw_balance = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw RestException.badRequest(__('user.no_user_in_header'));
        }

        const {card_id, amount} = req.body;
        const user = req.user;

        validFields(['card_id', 'amount'], req.body);

        // amount son va musbat bo'lishini tekshir
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            throw RestException.badRequest(__('transaction.invalid_amount'));
        }

        // USER TOLIQ AUTH QILGANMI?
        if (!req.user.phone_number) throw RestException.badRequest(__('user.not_full_auth_for_phone'))

        const max_w = await staticOptionsRepository.findOne({where: {key: "max_withdraw"}})
        const min_w = await staticOptionsRepository.findOne({where: {key: "min_withdraw"}})

        const maxWithdraw = max_w ? Number(max_w.value) : 0
        const minWithdraw = min_w ? Number(min_w.value) : 0

        if (amount > maxWithdraw) throw RestException.notFound(__mf('transaction.max_withdraw', {amount: maxWithdraw}));
        if (amount < minWithdraw) throw RestException.notFound(__mf('transaction.min_withdraw', {amount: minWithdraw}));

        // Kartani topish
        const card = await cardRepository.findOne({
            where: {
                deleted: false,
                id: card_id,
                user_id: user.id,
                is_user_card: true
            }
        });

        if (!card) {
            throw RestException.notFound(__('card.not_found'));
        }

        // Balans yetarli emas
        if (user.amount < amount) {
            throw RestException.badRequest(__('transaction.balance_not_enough'));
        }

        // Transactionni yaratish
        const transaction = transactionRepository.create({
            amount,
            card_id,
            card_number: card.number,
            card_name: card.name,
            type: 'wallet',
            status: 'pending',
            program: false,
            user_id: user.id,
            desc: "Withdraw VikingPay"
        });

        // Foydalanuvchining balansini kamaytirish
        user.amount -= amount;

        // Ikkala operatsiyani bitta transaction ichida saqlash
        await AppDataSource.transaction(async (manager) => {
            await manager.save(user);
            await manager.save(transaction);
        });

        await send_message('action', transaction)
        res.status(200).json({
            success: true,
            data: transaction
        });

    } catch (err) {
        next(err);
    }
};

// ADMIN
// ADMIN UH=CHUN TRANSACSIOLARNI OLSIH
export const all_transactions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {
            q,
            program,
            type,
            provider_id,
            status,
            user_id,
        } = req.body;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const query = transactionRepository
            .createQueryBuilder("transaction")
            .leftJoin("transaction.user", "user")
            .leftJoin("transaction.provider", "provider")
            .select([
                'transaction.id',
                'transaction.created_at',
                'transaction.status',
                'transaction.amount',
                'transaction.provider_id',
                'transaction.card_number',
                'transaction.card_name',
                'transaction.type',
                'transaction.program',
                'transaction.desc',
                'transaction.bet_provider',
                'user.id',
                'user.created_at',
                'user.status',
                'user.first_name',
                'user.last_name',
                'user.phone_number', // Qo‘shildi
                'user.amount',
                'user.chat_id',
                'provider.id',
                'provider.name',
                'provider.logo_id',
                'provider.min_amount',
                'provider.max_amount',
            ]);

        if (q) {
            query.andWhere(
                `(user.first_name ILIKE :q OR user.last_name ILIKE :q OR user.phone_number ILIKE :q OR CAST(user.id AS TEXT) ILIKE :q)`,
                {q: `%${q}%`}
            );
        }

        if (typeof program === 'boolean') {
            query.andWhere("transaction.program = :program", {program});
        }

        if (provider_id) {
            query.andWhere("transaction.provider_id = :provider_id", {provider_id});
        }

        if (type) {
            query.andWhere("transaction.type = :type", {type});
        }
        if (user_id) {
            query.andWhere("transaction.user = :user_id", {user_id: user_id});

        }

        const allowedStatuses = [
            "pending_deposit",
            "i_payed",
            "reject",
            "success_pay",
            "pending"
        ];
        if (status && allowedStatuses.includes(status)) {
            query.andWhere("transaction.status = :status", {status});
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .orderBy("transaction.created_at", "DESC")
            .getManyAndCount();

        res.json({
            data,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit)
        });

    } catch (err) {
        next(err);
    }
};

// ADMIN
// VIKING PAY XISOBINI RUCHNOY TO'LDIRISH
export const deposit_withdraw_manual = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const me = req.user;
        const {user_id, amount, description, type} = req.body;

        validFields(['user_id', 'amount', 'description', 'type'], req.body);

        if (amount <= 0) throw RestException.badRequest("Amount must be greater than 0");
        if (!['in', 'out'].includes(type)) {
            throw RestException.badRequest("Type is invalid. Only ('in', 'out') allowed");
        }

        await AppDataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: {id: user_id, deleted: false},
                lock: {mode: "pessimistic_write"}
            });

            if (!user) throw RestException.notFound(__('user.not_found'));

            const transaction = manager.create(Transaction, {
                amount,
                desc: description,
                status: "success_pay",
                type: "wallet",
                program: type === 'in',
                user: user
            });

            if (type === 'in') {
                user.amount = Number(user.amount) + Number(amount);
                logger.info(`💰 [DEPOSIT] ${user_id} ID foydalanuvchisiga, ${me.id} tomonidan ${amount} so'm pul solindi`);
            } else {
                if (amount > user.amount) throw RestException.notFound("User balance must upper amount");
                user.amount = Number(user.amount) - Number(amount);
                logger.info(`💸 [WITHDRAW] ${user_id} ID foydalanuvchisiga, ${me.id} tomonidan ${amount} so'm pul yechildi`);
            }
            await manager.save(user);
            await manager.save(transaction);

            send_message('info', transaction)
        });

        res.status(201).send({message: `Deposit manual: ${amount}`, success: true});
    } catch (err) {
        next(err);
    }
};

// ADMIN TOMONDAN HISOBGA KIRIM VA CHIQIMLARNI TASDIQLASH UCHUUN
// FUNKSIYA FAQAT HOMYONGA KIRIM CHIQIM TRANZAKSIYASINI TAMINLAYDI
export const accepting_transaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {transaction_id, status} = req.body
        validFields(['transaction_id', 'status'], req.body)

        const transaction = await handleTransactionStatusChange(transaction_id, status)
        res.status(200).json({success: true, data: transaction, message: "Status updated successfully."});

    } catch (err) {
        next(err)
    }
}

export function getTransTime(transaction: Transaction): number {
    const nowUtc = Date.now(); // UTC hozirgi vaqtni olish
    const createdUtc = transaction.created_at.getTime(); // Tranzaksiya yaratish vaqtini olish (UTC)

    const remaining = createdUtc + (10 * 60 * 1000) - nowUtc; // Qolgan vaqtni hisoblash

    return Math.max(0, Math.floor(remaining / 1000)); // Qolgan vaqtni sekundga aylantirish
}

export async function addUserBalance(user_id: number, transaction: Transaction) {
    const tr_user = await userRepository.findOne({where: {id: user_id, deleted: false}})
    if (!tr_user) throw RestException.notFound(__('user.not_found'))

    tr_user.amount = parseFloat(String(tr_user.amount)) + parseFloat(String((transaction.amount)));
    await userRepository.save(tr_user);
    logger.info(`${transaction.id} - Tranzaksiya bo'yicha ${user_id} - Foydalanuvchisiga, ${transaction.amount} so'm Depozit o'tkazildi`);

}

export async function addUserBalanceAmount(user_id: number, transaction: Transaction, amount: number) {
    const tr_user = await userRepository.findOne({where: {id: user_id, deleted: false}})
    if (!tr_user) throw RestException.notFound(__('user.not_found'))

    tr_user.amount = Number(tr_user.amount) + amount;
    await userRepository.save(tr_user);
    logger.info(`${transaction.id} - Tranzaksiya bo'yicha ${user_id} - Foydalanuvchisiga, ${amount} so'm Depozit o'tkazildi, ${transaction.amount} So'm, Belgilanganan summadan tashqari miqdor`);

}

export async function removeUserBalanceAmount(user_id: number, transaction: Transaction, amount: number) {
    const tr_user = await userRepository.findOne({where: {id: user_id, deleted: false}})
    if (!tr_user) throw RestException.notFound(__('user.not_found'))

    tr_user.amount = Number(tr_user.amount) - amount;
    await userRepository.save(tr_user);
    logger.error(`${transaction.id} - Tranzaksiya bo'yicha ${user_id} - Foydalanuvchisiga, ${amount} so'm Depoziti ,qaytarildi`);

}

export const get_transaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const trans_id = req.params.trans_id;

        //FAQAT O'ZINI TRANZAKSIYASINI CHAQIRADI
        const trans = await transactionRepository.findOne({
            where: {
                id: trans_id,
                deleted: false,
            },
            relations: ['provider','user']
        });
        if (!trans) throw RestException.notFound(__('transaction.not_found'));


        (trans as any).timer = getTransTime(trans);

        res.status(200).send({success: true, data: trans});

    } catch (err) {
        next(err)
    }
}

async function makeAvailableCard(transaction: Transaction) {
    //     TRANSAKSIYAGA ULANGAN KARTANI AKTIVLASHTIRIB QO'YAMIZ
    const card = await cardRepository.findOne({where: {id: transaction.card_id, deleted: false, is_user_card: false}});
    if (!card) throw RestException.notFound(__('card.not_found'))

    card.status = 'active';
    await cardRepository.save(card);

    logger.info(`${transaction.id} - Tranzaksiga ulangan karta:  ${card.number} - Yana aktivlashdi, Savdoda`);
}

export const handleTransactionStatusChange = async (
    transaction_id: string,
    status: 'success_pay' | 'reject'
): Promise<Transaction> => {
    const transaction = await transactionRepository.findOneBy({
        id: transaction_id,
        deleted: false,
        type: 'wallet'
    })
    if (!transaction) throw RestException.notFound(__('transaction.not_found'))

    if (!['success_pay', 'reject'].includes(status)) {
        throw RestException.badRequest("Type is invalid. Only ('success_pay', 'reject') allowed")
    }

    if (!['i_payed', 'pending'].includes(transaction.status)) {
        throw RestException.notFound("Bu to'lovni qayta o'zgartira olmaysiz")
    }

    if (transaction.program) {
        if (status === 'success_pay') {
            await addUserBalance(transaction.user_id, transaction)
        }
    } else {
        if (status === 'reject') {
            await addUserBalance(transaction.user_id, transaction)
        } else if (status === 'success_pay') {
            send_message('info', transaction)

        }
    }

    transaction.status = status
    await transactionRepository.save(transaction)


    return transaction
}
