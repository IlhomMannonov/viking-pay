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
            sendTelegramMessageInfo(chanel.chanel_id, text)

        })

    } else if (type == 'action') {
        const chanels = await chanelIntegrationRepository.find({where: {type: "action"}})

        if (trans.type == 'wallet') {
            if (!trans.program) {
                const txt = generateWalletPendingMessage({
                    program: trans.program,
                    amount: trans.amount,
                    user_id: trans.user_id,
                    card_number: trans.card_number,
                    desc: trans.desc,
                    status: trans.status,
                })
                chanels.forEach(chanel => {
                    sendTelegramMessageAction(chanel.chanel_id, txt, trans.id)
                })
            }
        }
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

🆔 ID: <code>${id}</code> 
👤 Фойдаланувчи ID: <code>${user_id}</code>
💳 Карта: ${card_number}
💸 Сумма: ${amount.toLocaleString('ru-RU')} сўм
👜 Манба: Hamён
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

🆔 ID: <code>${id}</code> 
🧾 Транзакция ID: <code>${operation_id}</code>
👤 Фойдаланувчи ID: <code>${user_id}</code>
🏢 Провайдер ID: <code>${provider_id}</code>
🏢 Провайдер номи: ${provider_name}
💸 Сумма: ${amount.toLocaleString('ru-RU')} сўм
📝 Изоҳ: ${desc || '-'}

🕒 Вақт: ${formatDateToYYYYMMDDHHmm(date)}
`
}

export function generateWalletPendingMessage(data: {
    program: boolean
    amount: number
    user_id: number
    card_number: string
    desc?: string,
    status: string
}): string {
    const {program, amount, user_id, card_number, desc, status} = data

    const emoji = program ? '⏳📥' : '⏳📤'
    const title = program
        ? 'КИРИМ КУТИЛМОҚДА (ҳамён орқали)'
        : 'ЧИҚИМ КУТИЛМОҚДА (ҳамён орқали)'

    return `${emoji} ${title}

👤 Фойдаланувчи ID: <code>${user_id}</code>
💳 Карта рақами: <code>${card_number}</code>
💸 Сумма: ${amount.toLocaleString('ru-RU')} сўм
📝 Изоҳ: ${desc || '-'}
🔻 Status: ${status || '-'}
`
}


export const sendTelegramMessageInfo = async (
    chat_id: string | number,
    text: string
): Promise<void> => {
    const bot_token = process.env.BOT_TOKEN
    if (!bot_token) throw new Error('BOT_TOKEN not found in environment variables')

    try {
        const url = `https://api.telegram.org/bot${bot_token}/sendMessage`

        const payload: any = {
            chat_id,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        }

        payload.reply_markup = {
            inline_keyboard: [
                [
                    {
                        text: "🧾Подробнее",
                        url: "https://google.com"
                    }
                ]
            ]
        }


        await axios.post(url, payload)
    } catch (err) {
        console.error('Telegram xabar yuborishda xatolik:')
    }
}
export const sendTelegramMessageAction = async (
    chat_id: string | number,
    text: string,
    id: string,
): Promise<void> => {
    const bot_token = process.env.BOT_TOKEN
    if (!bot_token) throw new Error('BOT_TOKEN not found in environment variables')

    try {
        const url = `https://api.telegram.org/bot${bot_token}/sendMessage`

        const payload: any = {
            chat_id,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        }

        payload.reply_markup = {
            inline_keyboard: [
                [
                    {
                        text: "🧾Подробнее",
                        url: "https://google.com"
                    },
                ],
                [
                    {
                        text: "✅ Подтверждение",
                        callback_data: "ok:" + id
                    },
                    {
                        text: "❌ Отмена",
                        callback_data: "no:" + id
                    },
                ]
            ]
        }


        await axios.post(url, payload)
    } catch (err) {
        console.error('Telegram xabar yuborishda xatolik:')
    }
}
