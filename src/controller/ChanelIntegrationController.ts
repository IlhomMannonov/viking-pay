import {NextFunction, Request, Response} from "express";
import {AppDataSource} from "../config/db";
import {validFields} from "../utils/CustomErrors";
import {ChanelIntegration} from "../entity/ChanelIntegration";
import axios from "axios";
import {RestException} from "../middilwares/RestException";


const chanelIntegrationRepository = AppDataSource.getRepository(ChanelIntegration);

export const add_chanel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {chanel_id, type, responsible_chat_ids} = req.body;

        validFields(['chanel_id', 'type'], req.body)

        if (type !== 'action' && type !== 'info') throw RestException.badRequest("Type faqat action, info bo'la oladi")

        const bot_token = process.env.BOT_TOKEN;

        if (!await isBotAdminInChannel(chanel_id)) throw RestException.badRequest("Bot kanalda admin emas");
        const chanel_info = await getChannelTitle(chanel_id);

        const saved_data = await chanelIntegrationRepository.save({
            chanel_id: chanel_id,
            chanel_token: bot_token,
            chanel_name: chanel_info,
            type: type,
            responsible_chat_ids: responsible_chat_ids
        })

        res.status(200).send({success: true, data: saved_data});

    } catch (err) {
        next(err)
    }
}

export const all = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const chanels = await chanelIntegrationRepository.find({order: {chanel_id: "desc"}});
        res.status(200).send({success: true, data: chanels});
    } catch (err) {
        next(err)
    }
}
export const update_chanel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {chanel_id, type, responsible_chat_ids} = req.body

        validFields(['chanel_id'], req.body)

        const exists = await chanelIntegrationRepository.findOneBy({chanel_id})
        if (!exists) throw RestException.notFound("Kanal topilmadi")

        if (type && !['action', 'info'].includes(type)) {
            throw RestException.badRequest("Type faqat 'action' yoki 'info' bo‘la oladi")
        }

        // Yangi kanal nomini olish (agar chanel_id o'zgarmasa, bu majburiy emas)
        const chanel_info = await getChannelTitle(chanel_id)

        await chanelIntegrationRepository.update({chanel_id}, {
            chanel_name: chanel_info,
            type: type || exists.type,
            responsible_chat_ids: responsible_chat_ids || exists.responsible_chat_ids
        })

        const updated = await chanelIntegrationRepository.findOneBy({chanel_id})

        res.status(200).send({success: true, data: updated})
    } catch (err) {
        next(err)
    }
}

export const delete_chanel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {chanel_id} = req.params

        const exists = await chanelIntegrationRepository.findOneBy({chanel_id})
        if (!exists) throw RestException.notFound("Kanal topilmadi")

        await chanelIntegrationRepository.delete({chanel_id})

        res.status(200).send({success: true, message: "Kanal muvaffaqiyatli o‘chirildi"})
    } catch (err) {
        next(err)
    }
}

async function isBotAdminInChannel(channelUsername: string): Promise<boolean> {
    try {
        const bot_token = process.env.BOT_TOKEN;
        const botusername = process.env.BOT_USERNAME;

        const url = `https://api.telegram.org/bot${bot_token}/getChatAdministrators?chat_id=${channelUsername}`
        const response = await axios.get(url)
        const admins = response.data.result

        return admins.some(
            (admin: any) => admin.user.username?.toLowerCase() === botusername?.toLowerCase()
        )
    } catch (error: any) {
        console.error(`Xatolik: ${channelUsername}`, error.response?.data || error.message)
        return false
    }
}

async function getChannelTitle(chatId: string) {
    try {
        const bot_token = process.env.BOT_TOKEN;

        const res = await axios.get(`https://api.telegram.org/bot${bot_token}/getChat?chat_id=${chatId}`)
        console.log('Kanal nomi:', res.data.result.title)
        return res.data.result.title
    } catch (err) {
        return null
    }
}