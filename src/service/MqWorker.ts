import {RabbitMQService} from "./MQServise";
import {AppDataSource, connectDB} from '../config/db';
import {Card} from "../entity/Card";
import logger from "../config/logger";
import {get_tg_cards, getCardInfoByNumber} from "../controller/TelegramAccountController";
import {addUserBalanceAmount} from "../controller/TransactionController";
import {Transaction} from "../entity/Transaction";
import axios from "axios";
import {TelegramMessage} from "../entity/TelegramMessage";
import {send_message} from "./TGChanelServise"; // Bazaga ulanish funksiyasini import qilish

const user = process.env.MQ_USER;
const pass = process.env.MQ_PASS;
const ip = process.env.MQ_IP;

const token = process.env.BOT_TOKEN;
const server_api = process.env.SERVER_API;

const rabbitmq = new RabbitMQService(`amqp://${user}:${pass}@${ip}:5672`);
const cardRepository = AppDataSource.getRepository(Card);
const transactionRepository = AppDataSource.getRepository(Transaction);
const telegramMessageRepository = AppDataSource.getRepository(TelegramMessage);


async function transactionWorker() {
    await rabbitmq.consumeFromQueue('card-transaction', async (msg: string) => {
        try {
            const transaction = JSON.parse(msg);

            const card = await cardRepository.findOne({
                where: {
                    id: transaction.card_id,
                    deleted: false,
                    status: "pending_pay"
                }
            });

            if (!card) {
                logger.error(`${transaction.card_id} - ID karta topilmadi. Tranzaksiya bekor qilindi.`);
                return;
            }

            const tg_cards = await get_tg_cards(Number(card.tg_account_id));
            const card_info = await getCardInfoByNumber(tg_cards.cards, card.card_hold);

            if (!card_info) {
                logger.warn(`Telegram kartasi topilmadi: ${card.card_hold}`);
                return;
            }

            const lastBalance = Number(transaction.last_card_amount);
            const currentBalance = Number(card_info.balance);
            const txAmount = Number(transaction.amount);

            const realDeposited = currentBalance - lastBalance;

            logger.info(`TR_ID: ${transaction.id}   📊 Oldingi balans: ${lastBalance}`);
            logger.info(`TR_ID: ${transaction.id}   💰 Hozirgi balans: ${currentBalance}`);
            logger.info(`TR_ID: ${transaction.id}   💸 Tranzaksiya miqdori: ${txAmount}`);
            logger.info(`TR_ID: ${transaction.id}   ➕ Real tushgan pul: ${realDeposited}`);

            if (realDeposited > 0) {
                // Foydalanuvchi hisobiga tushgan pulni qo‘shamiz
                await addUserBalanceAmount(transaction.user_id, transaction, realDeposited);

                if (realDeposited === txAmount) {
                    transaction.status = 'success_pay';
                    logger.info("TR_ID: ${transaction.id}   ✅ Pul to‘liq tushdi.");
                } else {
                    transaction.status = 'partial_success';
                    transaction.soft_amount = realDeposited;
                    transaction.amount = realDeposited;
                    logger.info(`TR_ID: ${transaction.id}   ⚠️ Pul qisman tushdi. yaratilgan: ${txAmount}, Tushgan pul: ${realDeposited}`);
                }

                card.limit -= realDeposited;
                await cardRepository.save(card);

                await send_message('info', transaction);

            } else {
                transaction.status = 'reject';
                logger.info("❌ Pul tushmagan.");
            }

            card.status = 'active';
            await cardRepository.save(card);
            await transactionRepository.save(transaction);

        } catch (err) {
            logger.error(`❗ Worker xatolikka uchradi: ${err}`);
        }
    });
}


async function sendMessageWorker() {
    await rabbitmq.consumeFromQueue('telegram-message', async (msg: string) => {
        try {
            const data = JSON.parse(msg);
            if (!data.chat_id || !data.type || !data.caption) {
                logger.warn("⚠️ Xato ma'lumot:", data);
                return;
            }
            // Xabar yuborish
            const response = await sendTelegramMessage(data);
            if (response?.ok) {
                await telegramMessageRepository
                    .createQueryBuilder()
                    .update()
                    .set({send_count: () => 'send_count + 1'})
                    .where("id = :id", {id: data.t_message_id})
                    .execute();
            } else {
                await telegramMessageRepository
                    .createQueryBuilder()
                    .update()
                    .set({un_send_count: () => 'un_send_count + 1'})
                    .where("id = :id", {id: data.t_message_id})
                    .execute();
            }

            messageCounter++;

            // Har 20 ta xabardan so'ng 1.3 sekund kutamiz
            if (messageCounter >= 20) {

                logger.info("⏸ 20 ta xabar yuborildi, 1.3s kutyapmiz...");
                await delay(1300);
                messageCounter = 0;
            }

        } catch (e) {
            logger.error("❌ Queue xabarni o‘qishda xatolik", e);
        }
    });

}


function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let messageCounter = 0;

async function sendTelegramMessage(data: any): Promise<any> {
    const {chat_id, type, caption, file_id, inline_buttons} = data;

    const url = `https://api.telegram.org/bot${token}/${
        type === 'photo' ? 'sendPhoto' :
            type === 'video' ? 'sendVideo' :
                'sendMessage'
    }`;

    const payload: any = {
        chat_id,
        parse_mode: 'HTML',
    };

    if (inline_buttons) {
        payload.reply_markup = inline_buttons.reply_markup;
    }

    if (type === 'text') {
        payload.text = caption;
    } else {
        payload.caption = caption;
        payload[type === 'photo' ? 'photo' : 'video'] = `${server_api}/file/get/${file_id}`;
    }

    try {
        const res = await axios.post(url, payload);
        return res.data;
    } catch (err: any) {
        const status = err.response?.status;
        const telegramError = err.response?.data;

        if (status === 429) {
            const retryAfter = telegramError?.parameters?.retry_after || 5;
            logger.warn(`⏳ 429! Telegram limit: ${retryAfter}s kutamiz`);
            await delay(retryAfter * 1000);
            return await sendTelegramMessage(data); // Recursive qayta urinish
        } else {
            logger.error(`❌ Xatolik [${status}] chat_id: ${chat_id}`, telegramError || err.message);
        }
    }
}


// Serverni ishga tushirish va PostgreSQL bazasiga ulanish
async function startApp() {
    try {
        // PostgreSQL bazasiga ulanish
        await connectDB();

        // Bazaga ulanish muvaffaqiyatli bo'lsa, worker'ni ishga tushirish
        await transactionWorker();

        await sendMessageWorker()

    } catch (error) {
        console.error('Error while starting the app:', error);
        process.exit(1);  // Xatolik yuzaga kelsa dasturni to‘xtatish
    }
}

// Dastur ishga tushadi
startApp().catch(err => console.error('Xatolik:', err));
