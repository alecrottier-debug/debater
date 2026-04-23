import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();

  // Serve persona avatars to clients that hit the backend directly
  // (e.g. the iOS app, which has no Next.js frontend to fall through to).
  // The canonical set lives in backend/public/avatars/ and ships with the
  // Docker image; the frontend/public copy is kept in sync for the web app.
  app.useStaticAssets(join(process.cwd(), 'public', 'avatars'), {
    prefix: '/avatars/',
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
