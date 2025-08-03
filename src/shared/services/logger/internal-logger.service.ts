import * as winston from 'winston';
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalLoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const loggerOptions = this.configService.get('logger');
    
    this.logger = winston.createLogger({
      level: loggerOptions?.level || 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'MM/DD/YYYY, h:mm:ss A' }),
        winston.format.printf(({ timestamp, level, message }) => {
          const pid = process.pid;
          const upperLevel = level.toUpperCase();
          const colorizedLevel = this.getColorizedLevel(upperLevel);

          return `\x1b[36m[Core] ${pid}\x1b[0m  - \x1b[37m${timestamp}\x1b[0m     ${colorizedLevel} ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
      ],
    });
  }

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace?: string) {
    this.logger.error(`${message}${trace ? ` - ${trace}` : ''}`);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }

  private getColorizedLevel(level: string) {
    switch (level) {
      case 'ERROR':
        return '\x1b[31mERROR\x1b[0m';
      case 'WARN':
        return '\x1b[33mWARN\x1b[0m';
      case 'INFO':
        return '\x1b[32mINFO\x1b[0m';
      case 'DEBUG':
        return '\x1b[34mDEBUG\x1b[0m';
      case 'VERBOSE':
        return '\x1b[35mVERBOSE\x1b[0m';
      default:
        return level;
    }
  }
}
