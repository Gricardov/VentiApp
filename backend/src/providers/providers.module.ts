import { Module, Global } from '@nestjs/common';
import { UserProvider } from './user.provider';
import { EventProvider } from './event.provider';
import { EnrollmentProvider } from './enrollment.provider';

@Global()
@Module({
    providers: [UserProvider, EventProvider, EnrollmentProvider],
    exports: [UserProvider, EventProvider, EnrollmentProvider],
})
export class ProvidersModule { }
