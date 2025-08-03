import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Injectable,
  } from '@nestjs/common';
  import { InternalLoggerService } from '@shared/services/logger/internal-logger.service';
  
  @Catch()
  @Injectable()
  export class HttpExceptionFilter implements ExceptionFilter {
    constructor(private readonly logger: InternalLoggerService) {}
  
    catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();
  
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
  
      const errorResponse =
        exception instanceof HttpException
          ? exception.getResponse()
          : { message: 'Internal server error' };
  
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(errorResponse)}`,
        exception instanceof Error ? exception.stack : undefined
      );
  
      response.status(status).json({
        statusCode: status,
        message: errorResponse,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
  