import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('nwscore API')
    .setDescription('API documentation for the nwscore API')
    .setVersion('0.1')
    .addApiKey(
      { type: 'apiKey', name: 'Authorization', in: 'header' },
      'Session',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
