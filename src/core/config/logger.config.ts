import * as winston from 'winston';

export const loggerConfig = () => ({
  logger: {
    level: process.env.LOG_LEVEL || 'debug',
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  },
});
