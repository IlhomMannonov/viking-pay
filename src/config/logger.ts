import winston from 'winston';

// Logger konfiguratsiyasi
const logger = winston.createLogger({
    level: 'info', // Standart daraja: info
    format: winston.format.combine(
        winston.format.colorize(), // Ranglarni qo‘shish
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Vaqtni formatlash
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`; // Log formatini sozlash
        })
    ),
    transports: [
        new winston.transports.Console(), // Konsolga log yozish
        new winston.transports.File({ filename: 'logs/app.log' }) // Faylga log yozish
    ]
});

export default logger;
