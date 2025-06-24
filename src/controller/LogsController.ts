import {NextFunction, Request, Response} from "express";
import path from "path";
import fs from "fs";
import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";


export const all_logs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const logDir = '/app/logs'// papka yo‘li

        // Fayl mavjudligini tekshirish
        if (!fs.existsSync(logDir)) {

            res.status(404).json({message: "Log papkasi topilmadi"})
        }

        // Papkadagi fayllarni o‘qish
        const files = await fs.promises.readdir(logDir)

        // Faqat .log fayllarini filtrlaymiz
        const logFiles = files.filter(file => file.endsWith('.log'))

        // Fayl nomlari va ularning hajmini olish (ixtiyoriy)
        const fileStats = await Promise.all(
            logFiles.map(async file => {
                const fullPath = path.join(logDir, file)
                const stats = await fs.promises.stat(fullPath)
                return {
                    name: file,
                    size: stats.size,
                    created_at: stats.birthtime,
                    updated_at: stats.mtime
                }
            })
        )

        res.status(200).json({
            message: 'Log fayllar ro‘yxati',
            data: fileStats
        })
    } catch (error) {
        next(error)
    }
}

export const get_log = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filename = req.params.filename

        if (!filename || filename.includes('..')) {
            return res.status(400).json({message: 'Noto‘g‘ri fayl nomi'})
        }

        const logDir = '/app/logs'// papka yo‘li

        const filePath = path.join(logDir, filename)

        // Fayl mavjudligini tekshirish
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({message: 'Log fayl topilmadi'})
        }

        // Faylni o‘qish
        const content = await fs.promises.readFile(filePath, 'utf8')

        res.setHeader('Content-Type', 'text/plain')
        res.send(content)

    } catch (error) {
        next(error)
    }
}