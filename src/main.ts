import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  const configService = app.get(ConfigService);

  // HTTP security headers (same setup as the other subgraphs)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // required for GraphQL playground
      contentSecurityPolicy: process.env.ENVIRONMENT === 'production',
    }),
  );

  // Restrict CORS to known origins. The gateway calls this service
  // server-to-server, so browsers never need it; an empty list allows none.
  const allowedOrigins = (configService.get<string>('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    methods: ['GET', 'POST'],
    credentials: true,
  });

  // Limit request body size
  app.useBodyParser('json', { limit: '1mb' });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = configService.get<number>('PORT') || 4005;
  await app.listen(port);

  logger.log(`Blog & Community subgraph is running on port ${port}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error starting the application:', err);
  process.exit(1);
});
