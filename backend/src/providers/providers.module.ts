import { Module, Global } from '@nestjs/common';
import { UserProvider } from './user.provider';
import { EventProvider } from './event.provider';
import { EnrollmentProvider } from './enrollment.provider';
import { NotificationProvider } from './notification.provider';

@Global()
@Module({
    providers: [UserProvider, EventProvider, EnrollmentProvider, NotificationProvider],
    exports: [UserProvider, EventProvider, EnrollmentProvider, NotificationProvider],
})
export class ProvidersModule { }
