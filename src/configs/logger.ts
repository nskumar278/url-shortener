import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const { combine, timestamp, printf, json, colorize } = format;

const isProduction = process.env.NODE_ENV === 'production';

const productionFormat = combine(
    timestamp(),
    json()
);

const developmentFormat = combine(
    timestamp(),
    printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${metaString}`;
    })
);

const logger = createLogger({
    level: isProduction ? "info" : "debug",
    format: isProduction ? productionFormat : developmentFormat,
    transports: [
        new transports.Console({
            format: isProduction ? productionFormat : combine(
                colorize(),
                developmentFormat
            )
        }),
        new DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '5m',
            maxFiles: 3,
        }),
        new DailyRotateFile({
            filename: "logs/error-%DATE%.log",
            level: "error",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "5m",
            maxFiles: 3,
        }),
    ],
});


export default logger;