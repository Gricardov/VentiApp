import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProvidersModule } from './providers/providers.module';
import { AuthModule } from './auth/auth.module';
import { ConversationModule } from './conversation/conversation.module';
import { EnrollmentModule } from './api/enrollment/enrollment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProvidersModule,
    AuthModule,
    ConversationModule,
    EnrollmentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
