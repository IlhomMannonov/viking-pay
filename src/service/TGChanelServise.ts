import {AppDataSource} from "../config/db";
import {ChanelIntegration} from "../entity/ChanelIntegration";
import {Transaction} from "../entity/Transaction";
import axios from "axios";

const chanelIntegrationRepository = AppDataSource.getRepository(ChanelIntegration);

export async function send_message(type: string, trans: Transaction): Promise<void> {
    if (type == 'info') {
        const chanels = await chanelIntegrationRepository.find({where: {type: "info"}})
        const text = generateWalletMessage({
            id: trans.id,
            user_id: trans.user_id,
            program: trans.program,
            amount: trans.amount,
            card_number: trans.card_number,
            desc: trans.desc,
            date: trans.card_number
        })

        chanels.forEach(chanel => {
            sendTelegramMessage(chanel.chanel_id, text)

        })

    } else if (type == 'action') {

    }
}

async function send_info(trans: Transaction): Promise<void> {

}


function generateWalletMessage(data: {
    id: string
    user_id: number
    program: boolean
    amount: number
    card_number: string
    desc?: string
    date: string
}): string {
    const {id, user_id, program, amount, card_number, desc, date} = data

    const emoji = program ? '📥' : '📤'
    const title = program ? 'КИРИМ ТУШДИ (wallet)' : 'ЧИҚИМ БЎЛДИ (wallet)'

    return `${emoji} ${title}

🔁 ID: ${id}
💳 Карта: ${card_number}
👤 Фойдаланувчи ID: ${user_id}
💸 Сумма: ${amount.toLocaleString('ru-RU')} сўм
👜 Манба: Hamyon
📝 Изоҳ: ${desc || '-'}

🕒 Вақт: ${date}
`
}

export const sendTelegramMessage = async (chat_id: string | number, text: string): Promise<void> => {
    const bot_token = process.env.BOT_TOKEN
    if (!bot_token) throw new Error('BOT_TOKEN not found in environment variables')

    try {
        const url = `https://api.telegram.org/bot${bot_token}/sendMessage`
        await axios.post(url, {
            chat_id,
            text,
            parse_mode: 'HTML', // yoki 'Markdown' agar kerak bo‘lsa
            disable_web_page_preview: true
        })
    } catch (err) {
        console.error('Telegram xabar yuborishda xatolik:')
        throw new Error('Telegram xabar yuborilmadi')
    }
}