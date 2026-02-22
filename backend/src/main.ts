import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Try to load HTTPS certificates
  const certPath = path.join(process.cwd(), '..', 'certs', 'localhost+2.pem');
  const keyPath = path.join(process.cwd(), '..', 'certs', 'localhost+2-key.pem');

  let httpsOptions: { key: Buffer; cert: Buffer } | undefined;
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    console.log('🔒 HTTPS certificates loaded');
  }

  const app = await NestFactory.create(AppModule, httpsOptions ? { httpsOptions } : {});

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://localhost:3000',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`🚀 Venti Backend running on ${protocol}://localhost:${port}`);
}
bootstrap();

