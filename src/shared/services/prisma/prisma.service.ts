import {
	Injectable,
	OnModuleInit,
	OnModuleDestroy,
  } from '@nestjs/common';
  import { PrismaClient } from '@prisma/client';
  import { InternalLoggerService } from '../logger/internal-logger.service';
  
  @Injectable()
  export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
  {
	constructor(private readonly logger: InternalLoggerService) {
	  super();
	}
  
	async onModuleInit() {
	  try {
		await this.$connect();
	  } catch (error) {
		this.logger.error('Failed to connect to the database.', error.stack);
		throw error;
	  }
	}
  
	async onModuleDestroy() {
	  try {
		await this.$disconnect();
		this.logger.log('Database connection closed successfully.');
	  } catch (error) {
		this.logger.error('Failed to close the database connection.', error.stack);
	  }
	}
  }
  