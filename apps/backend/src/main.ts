import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── CORS ──────────────────────────────────────────────────────────────────
  // FRONTEND_URLS: comma-separated exact origins set in Railway env vars.
  // Vercel apps (*.vercel.app) are always allowed so you don't need to
  // redeploy every time a preview URL changes.
  const exactAllowed = new Set([
    // localhost dev ports
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    // Production origins from Railway env (comma-separated)
    ...(process.env.FRONTEND_URLS || '')
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean),
  ]);

  app.enableCors({
    origin: (origin, cb) => {
      // Allow server-to-server / Swagger / curl (no Origin header)
      if (!origin) return cb(null, true);
      // Exact match
      if (exactAllowed.has(origin)) return cb(null, true);
      // Any Vercel deployment (production + preview URLs)
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true);
      // Localhost regex fallback
      if (/^https?:\/\/(localhost|127\.0\.0\.1):(5173|5174|5175)$/.test(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // ── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: false,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
    }),
  );

  // ── Swagger ───────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('RampX P2P API')
    .setDescription('P2P Crypto On/Off Ramp — Secure Escrow API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 RampX API running at http://localhost:${port}/api`);
  console.log(`📚 Swagger docs at   http://localhost:${port}/api/docs\n`);
}

bootstrap();
