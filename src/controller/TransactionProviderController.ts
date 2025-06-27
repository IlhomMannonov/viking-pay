import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {validFields} from "../utils/CustomErrors";
import {AppDataSource} from "../config/db";
import {Provider} from "../entity/Provider";
import {RestException} from "../middilwares/RestException";
import {__, __mf} from "i18n";
import {CashDesk} from "../service/XProviderService";
import logger from "../config/logger";
import {User} from "../entity/User";
import {Transaction} from "../entity/Transaction";
import {MoreThan} from "typeorm";
import {send_message} from "../service/TGChanelServise";

const providerRepository = AppDataSource.getRepository(Provider);
const userRepository = AppDataSource.getRepository(User);
const transactionRepository = AppDataSource.getRepository(Transaction);

export const check_id = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id, provider_id} = req.body;
        validFields(['id', 'provider_id'], req.body);

        const provider = await providerRepository.findOne({where: {id: provider_id, deleted: false}});
        if (!provider) throw RestException.badRequest(__('provider.not_found'))

        const cashdesk = new CashDesk(provider.api, provider.hash, provider.cashierpass, provider.login, provider.cashdeskid)
        const player = await cashdesk.searchPlayer(id)
        if (!player) throw RestException.badRequest(__('player.not_found'))

        res.status(200).send({player})
    } catch (err) {
        next(err)
    }
}

//TODO Mostbet uchun boshqa api, chiqarishdagi so'rovlarni ham to'g'irlashing kerak
export const deposit = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = req.user;
        if (!user) throw RestException.badRequest(__('user.no_user_in_header'))

        const {id, provider_id, amount} = req.body;
        validFields(['id', 'provider_id', 'amount'], req.body);

        // PROVIDER TO'G'RIMI
        const provider = await providerRepository.findOne({where: {id: provider_id, deleted: false}});
        if (!provider) throw RestException.badRequest(__('provider.not_found'))


        //OXIRGI 5 DAQIQA ICHIDA DEPOZIT QILA OLMAYDI
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const providerFive = await transactionRepository.findOne({
            where: {
                deleted: false,
                type: "provider",
                provider_id: provider.id,
                user_id: user.id,
                program: true,
                created_at: MoreThan(fiveMinutesAgo),
            },
            order: {created_at: "DESC"}
        });
        if (providerFive) {
            const {minutes, seconds} = getRemainingTime(providerFive.created_at);
            throw RestException.badRequest(__mf('provider.five_minute_limit_deposit', {
                provider: provider.name, minute: minutes, second: seconds
            }));
        }

        const cashdesk = new CashDesk(provider.api, provider.hash, provider.cashierpass, provider.login, provider.cashdeskid)

        // KASSADA PUL BORMI UZI
        const cashier: any = await cashdesk.getBalance()
        if (cashier.Limit < amount) {
            logger.error(`${provider.name} da Limit kam qoldi, User hisob toldira olmadi. Userid= ${user.id}`)
            throw RestException.badRequest(__('provider.error_provider_balance'))
        }

        // O'YINCHI TOPILDIMI?
        const player = await cashdesk.searchPlayer(id)
        if (!player) throw RestException.notFound(__('player.not_found'))

        //KIRGIZILAYOTGAN PUL MIQDORLARI TO'G'RI KELADIMI
        if (Number(amount) < provider.min_amount || Number(amount) > provider.max_amount)
            throw RestException.notFound(__mf('provider.min_max', {
                min: provider.min_amount,
                max: provider.max_amount
            }));

        //USERNING VIKING PAYIDA PUL BORMI UZI
        if (user.amount < Number(amount)) throw RestException.notFound(__mf('provider.user_balance_not_enough', {amount: user.amount}));


        const cashdesk_deposit: any = await cashdesk.deposit(id, Number(amount))
        logger.info(JSON.stringify(cashdesk_deposit));
        if (!cashdesk_deposit.Success) {
            if (cashdesk_deposit.MessageId === 100331) {
                logger.error(`${user.id} - User pul solish imkoni yoq chunki bu xisobda chiqarish so'rovi mavjud`)
                throw RestException.badRequest(__('provider.pending_withdraw_contora'));
            }
            logger.error("CashDesk depozitdan xato bo'ldi yoki userni saqlashda")
            throw RestException.badRequest(__('provider.unknown_error'));
        }
        let createdTransaction: Transaction | null = null;
        await AppDataSource.transaction(async (manager) => {
            user.amount = Number(user.amount) - Number(amount);
            await manager.save(user); // userni saqlash

            const tr = transactionRepository.create({
                amount: amount,
                soft_amount: amount,
                user_id: user.id,
                provider_id: provider.id,
                type: "provider",
                program: true,
                desc: `Send to ${provider.name}`,
                status: "success_pay",
                bet_provider: id,
                operation_id: cashdesk_deposit.OperationId
            });

            createdTransaction = await manager.save(tr);


        });
        logger.info(`${user.id} Foydalanuvchi ${provider.name} - ${player.Name} O'yinchi hisobini ${amount} ga to'ldirdi`);

        if (createdTransaction)
            await send_message('info', createdTransaction)

        res.status(200).send({
            success: true,
            data: createdTransaction,
            message: __mf('provider.success_deposit', {provider: provider.name, amount: amount})
        })

    } catch (err) {
        next(err)
    }
}

export const withdraw = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            logger.warn('No user found in request header');
            throw RestException.badRequest(__('user.no_user_in_header'));
        }

        const {provider_id, code, id} = req.body;
        validFields(['provider_id', 'code', 'id'], req.body);

        logger.info(`Withdraw request: user_id=${user.id}, provider_id=${provider_id}, code=${code}, player_id=${id}`);

        // ✅ PROVIDER CHECK
        const provider = await providerRepository.findOne({where: {id: provider_id, deleted: false}});
        if (!provider) {
            logger.warn(`Provider not found: id=${provider_id}`);
            throw RestException.badRequest(__('provider.not_found'));
        }

        const cashdesk = new CashDesk(
            provider.api,
            provider.hash,
            provider.cashierpass,
            provider.login,
            provider.cashdeskid
        );

        // ✅ PLAYER SEARCH
        const player = await cashdesk.searchPlayer(id);
        if (!player) {
            logger.warn(`Player not found in provider: player_id=${id}`);
            throw RestException.notFound(__('player.not_found'));
        }

        logger.info(`Player found: ${JSON.stringify(player)}`);

        // ✅ PAYOUT REQUEST
        const payout: any = await cashdesk.payout(id, code);

        if (payout.Success === true) {
            const amount = Math.abs(Number(payout.Summa));

            logger.info(`Payout successful: amount=${amount}, operation_id=${payout.OperationId}`);

            await AppDataSource.transaction(async (manager) => {
                const tr = transactionRepository.create({
                    amount,
                    soft_amount: amount,
                    user_id: user.id,
                    provider_id: provider.id,
                    type: "provider",
                    program: false,
                    desc: `Payout to ${provider.name}`,
                    status: "success_pay",
                    bet_provider: id,
                    operation_id: payout.OperationId,
                });

                await manager.save(tr);

                user.amount = user.amount + amount;
                await manager.save(user);
            });

        } else {
            logger.warn(`Payout failed: message=${payout.Message}, messageId=${payout.MessageId}`);
            if (payout.MessageId === 100406) {
                throw RestException.badRequest(__('provider.not_found_payout_request'));
            }
            throw RestException.badRequest(payout.Message);
        }

        logger.info(`Withdraw completed: user_id=${user.id}, provider=${provider.name}, amount=${payout.Summa}`);

        res.status(200).send({
            message: __mf('provider.success_withdraw', {
                provider: provider.name,
                amount: Math.abs(Number(payout.Summa)),
            })
        });

    } catch (err) {
        logger.error('Withdraw error', err);
        next(err);
    }
};


const getRemainingTime = (createdAt: Date, limitMs = 5 * 60 * 1000) => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const msLeft = limitMs - elapsed;

    const minutes = Math.floor(msLeft / 60000);
    const seconds = Math.floor((msLeft % 60000) / 1000);

    return {minutes, seconds};
};