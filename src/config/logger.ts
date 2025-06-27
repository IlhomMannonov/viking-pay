import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

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
            dirname: '/app/logs',
            filename: 'app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: false,
            maxSize: '10m',
            maxFiles: '7d',
            level: 'info'
        }),

        new DailyRotateFile({
            dirname: '/app/logs',
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: false,
            maxSize: '10m',
            maxFiles: '14d',
            level: 'error'
        })
    ]
})

export default logger
