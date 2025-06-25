import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// Logger konfiguratsiyasi
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`
        })
    ),
    transports: [
        new winston.transports.Console(),

        new DailyRotateFile({
            dirname: '../logs',              // Log papkasi
            filename: 'app-%DATE%.log',        // Har kunlik fayl nomi
            datePattern: 'YYYY-MM-DD',         // Sana formati
            zippedArchive: false,              // Gz qilish kerakmi — optional
            maxSize: '10m',                    // Har bir fayl maksimal o‘lchami
            maxFiles: '7d',                    // Oxirgi 7 kunni saqlaydi
            level: 'info'                      // Log darajasi
        })
    ]
})

export default logger
