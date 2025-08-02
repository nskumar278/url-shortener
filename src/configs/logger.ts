import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, json, colorize } = format;

const isProduction = process.env.NODE_ENV === 'production';

const productionFormat = combine(
  timestamp(),
  json()
);

const developmentFormat = combine(
  timestamp(),
  printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

const logger = createLogger({
    level: isProduction ? "warn" : "debug",
    format: isProduction ? productionFormat : developmentFormat,
    transports: [
        new transports.Console({
            format: isProduction ? productionFormat : combine(
                colorize(),
                developmentFormat
            )
        }),
    ],
});


export default logger;