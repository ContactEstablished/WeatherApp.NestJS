import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Global prefix `api`, EXCLUDING the health route so endpoint #1 stays at
  // `GET /health` (outside /api) per RoadMap §0.2 / §4. #2-#11 resolve under /api.
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  // CORS for the Angular dev origin (overridable via CORS_ORIGIN).
  const corsOrigin =
    config.get<string>('CORS_ORIGIN') ?? 'http://localhost:4200';
  app.enableCors({ origin: corsOrigin });

  // Global validation: coerce bodies to DTO classes and reject unknown fields.
  // camelCase JSON is preserved — no key-renaming transformer is added.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
