import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { ProvidersModule } from '../../providers/providers.module';

@Module({
    imports: [ProvidersModule],
    controllers: [NotificationController],
})
export class NotificationModule { }
