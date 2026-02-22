import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { ProvidersModule } from '../../providers/providers.module';

@Module({
    imports: [ProvidersModule],
    controllers: [EnrollmentController],
})
export class EnrollmentModule { }
