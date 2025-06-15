import {NextFunction, Request, Response} from "express";
import multer, {MulterError} from 'multer';
import path from 'path';
import fs from 'fs';
import {AppDataSource} from "../config/db";
import {Attachment} from "../entity/Attachment";
import {RestException} from "../middilwares/RestException";
import axios from "axios";

const attachmentRepository = AppDataSource.getRepository(Attachment);

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    upload(req, res, async (err) => {
        if (err instanceof MulterError) {
            console.error(err);
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    message: 'Kutilmagan fayl topildi! Iltimos, ruxsat etilgan fayl nomlari yoki sonini tekshiring.',
                });
            } else if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    message: 'Yuklanadigan fayllar soni cheklangan.',
                });
            } else {
                return res.status(500).json({
                    message: 'Fayl yuklashda xato yuz berdi',
                    error: err.message,
                });
            }
        } else if (err) {
            console.error("Fayl yuklashda xato:", err);
            return res.status(500).json({message: 'Fayl yuklashda xato yuz berdi'});
        }

        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({message: 'Fayllar yuborilmagan!'});
        }

        try {
            const savedFiles = [];

            for (const file of req.files as Express.Multer.File[]) {
                const attachment = attachmentRepository.create({
                    original_name: file.originalname,
                    file_name: file.filename,
                    file_size: file.size,
                    href: `/viking_files/${file.filename}`,
                    file_type: getFileExtension(file.filename),
                });
                const savedAttachment = await attachmentRepository.save(attachment);
                savedFiles.push(savedAttachment);
            }

            res.status(200).json({
                message: 'Fayllar muvaffaqiyatli yuklandi',
                files: savedFiles,
            });
        } catch (error) {
            console.error("Fayllarni saqlashda xato:", error);
            res.status(500).json({
                message: 'Fayllarni saqlashda xato yuz berdi',
                error,
            });
        }
    });
};

export const getFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const file_id = req.params.id;

        if (!file_id) {
            throw RestException.badRequest("file_id is required");
        }
        const attachment = await attachmentRepository.findOne({where: {file_name: String(file_id)}});

        if (!attachment) {
            throw RestException.notFound("ATTACHMENT");
        }

        const filename = attachment.file_name; // URL'dan fayl nomini olish
        const filePath = path.join('/app/uploads', filename);
        // Fayl mavjudligini tekshirish
        if (!fs.existsSync(filePath)) {
            res.status(404).json({message: 'Fayl topilmadi!'});
        }

        // Faylni yuborish
        res.sendFile(filePath);
    } catch (error) {
        console.error('Faylni olishda xato:', error);
        res.status(500).json({message: 'Faylni olishda xato yuz berdi'});
    }
};
export const getFileById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const file_id = req.params.id;

        if (!file_id) {
            throw RestException.badRequest("file_id is required");
        }
        const attachment = await attachmentRepository.findOne({where: {id: Number(file_id)}});

        if (!attachment) {
            throw RestException.notFound("ATTACHMENT");
        }

        const filename = attachment.file_name; // URL'dan fayl nomini olish
        const filePath = path.join('/app/uploads', filename);
        // Fayl mavjudligini tekshirish
        if (!fs.existsSync(filePath)) {
            res.status(404).json({message: 'Fayl topilmadi!'});
        }

        // Faylni yuborish
        res.sendFile(filePath);
    } catch (error) {
        console.error('Faylni olishda xato:', error);
        res.status(500).json({message: 'Faylni olishda xato yuz berdi'});
    }
};


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = '/root/viking_files'; // Fayllar saqlanadigan papkani ko'rsatish

        // Papka mavjudligini tekshirish va kerak bo'lsa yaratish
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, {recursive: true});
        }

        cb(null, uploadPath); // Fayllar saqlanadigan papka
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Fayl nomini vaqt tamg'asi bilan o'zgartiramiz
    },
});


// Bir nechta faylni yuklash uchun `upload.array()` dan foydalanamiz
const upload = multer({
    storage,
    limits: {fileSize: 5 * 1024 * 1024}, // Maksimal fayl hajmi 5 MB
}).array('file', 10);

// `files` - bu form field nomi, `10` - yuklanadigan fayllar soni limiti
function getFileExtension(filename: string): string {
    return path.extname(filename);
}


export async function download_file_create_attachment(link: string) {
    try {
        const response = await axios({
            method: 'GET',
            url: link,
            responseType: 'stream',
        });

        const ext = path.extname(link).split('?')[0] || '.svg';
        const filename = `img_${Date.now()}${ext}`;
        const savePath = path.join('/root/viking_files', filename);

        const writer = fs.createWriteStream(savePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const stats = fs.statSync(savePath);
        const fileSizeInBytes = stats.size;

        const attachment = attachmentRepository.create({
            original_name: path.basename(link), // asl nomi
            file_name: filename,
            file_size: fileSizeInBytes,
            href: `/viking_files/${filename}`,
            file_type: getFileExtension(filename),
        });

        return await attachmentRepository.save(attachment);


    } catch (err) {
        console.error('Faylni olishda xato:', err);
        throw err;
    }
}
