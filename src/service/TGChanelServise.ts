import {AppDataSource} from "../config/db";
import {ChanelIntegration} from "../entity/ChanelIntegration";
import {Transaction} from "../entity/Transaction";
import axios from "axios";
import {formatDateToYYYYMMDDHHmm} from "../utils/CommonUtils";
import {Provider} from "../entity/Provider";

const chanelIntegrationRepository = AppDataSource.getRepository(ChanelIntegration);
const providerRepository = AppDataSource.getRepository(Provider);

export async function send_message(type: string, trans: Transaction): Promise<void> {
    if (type == 'info') {
        const chanels = await chanelIntegrationRepository.find({where: {type: "info"}})

        let text = ''

        if (trans.type == 'wallet')
            text = generateWalletMessage({
                id: trans.id,
                user_id: trans.user_id,
                program: trans.program,
                amount: trans.amount,
                card_number: trans.card_number,
                desc: trans.desc,
                date: trans.created_at
            })
        else if (trans.type == 'provider') {

            const provider = await providerRepository.findOne({where: {id: trans.provider_id}})

            text = generateProviderMessage({
                id: trans.id,
                program: trans.program,
                amount: trans.amount,
                operation_id: trans.operation_id,
                user_id: trans.user_id,
                provider_id: trans.provider_id,
                provider_name: provider ? provider?.name : '',
                desc: trans.desc,
                date: trans.created_at,
            })
        }
        chanels.forEach(chanel => {
            sendTelegramMessage(chanel.chanel_id, text)

        })

    } else if (type == 'action') {

    }
}


function generateWalletMessage(data: {
    id: string
    user_id: number
    program: boolean
    amount: number
    card_number: string
    desc?: string
    date: Date
}): string {
    const {id, user_id, program, amount, card_number, desc, date} = data

    const emoji = program ? '📥' : '📤'
    const title = program ? 'КИРИМ ТУШДИ (wallet)' : 'ЧИҚИМ БЎЛДИ (wallet)'

    return `${emoji} ${title}

\`🔁 ID: ${id}\`
\`👤 Фойдаланувчи ID: ${user_id}\`
💳 Карта: ${card_number}
💸 Сумма: ${amount.toLocaleString('ru-RU')} сўм
👜 Манба: Hamyon
📝 Изоҳ: ${desc || '-'}

🕒 Вақт: ${formatDateToYYYYMMDDHHmm(date)}
`

}

function generateProviderMessage(data: {
    id: string
    program: boolean
    amount: number
    operation_id: string
    user_id: number
    provider_id: number
    provider_name: string
    desc?: string
    date: Date
}): string {
    const {id, program, amount, operation_id, user_id, provider_id, provider_name, desc, date} = data

    const emoji = program ? '📥' : '📤'
    const title = program
        ? 'КИРИМ ТУШДИ (провайдер орқали)'
        : 'ЧИҚИМ БЎЛДИ (провайдер орқали)'

    return `${emoji} ${title}

\`🔁 ID: ${id}\`
\`🧾 Транзакция ID: ${operation_id}\`
\`👤 Фойдаланувчи ID: ${user_id}\`
\`🏢 Провайдер ID: ${provider_id}\`
🏢 Провайдер номи: ${provider_name}
💸 Сумма: ${amount.toLocaleString('ru-RU')} сўм
📝 Изоҳ: ${desc || '-'}

🕒 Вақт: ${formatDateToYYYYMMDDHHmm(date)}
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